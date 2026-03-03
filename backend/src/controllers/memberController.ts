import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import prisma from '../prisma';
import { formatRegionName } from '../utils/displayFormatters';
import { getCurrentAcademicStatus, isMemberFinalist, isMemberAlumni } from '../utils/academicProgressionHelper';
import { activeMemberFilter } from '../utils/queryHelpers';
import { Prisma } from '@prisma/client';
import { createMemberRecord } from '../services/memberService';
import { scheduleWelcomeEmail } from '../services/emailService';

const createMemberSchema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phoneNumber: z.string(),
    gender: z.enum(['MALE', 'FEMALE']),
    regionId: z.string().uuid('Invalid region ID'),
    classificationTagId: z.string().uuid().optional(),
    additionalTagIds: z.array(z.string().uuid()).optional(),
    courseId: z.string().uuid().optional(),
    initialYearOfStudy: z.number().min(1).max(7).optional(),
    initialSemester: z.number().min(1).max(2).optional(),
    residenceId: z.string().uuid().optional(),
    hostelName: z.string().optional(),
    registrationMode: z.enum(['NEW_MEMBER', 'LEGACY_IMPORT', 'TRANSFER', 'READMISSION']).optional(),
    assignFirstTimerTag: z.boolean().optional(),
});

// Create new member
export const createMember = async (req: Request, res: Response) => {
    try {
        const validatedData = createMemberSchema.parse(req.body);

        // ── Pre-flight validation ────────────────────────────────────────────
        const [existingMember, region] = await Promise.all([
            prisma.member.findUnique({ where: { email: validatedData.email } }),
            prisma.region.findUnique({ where: { id: validatedData.regionId } }),
        ]);

        if (existingMember) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        if (!region) {
            return res.status(400).json({ error: 'Invalid region' });
        }

        if (validatedData.courseId) {
            const course = await prisma.course.findUnique({ where: { id: validatedData.courseId } });
            if (!course) return res.status(400).json({ error: 'Invalid course' });
        }

        // ── Atomic transaction: create member + tags + email ─────────────────
        const { member, fellowshipNumber } = await prisma.$transaction(async (tx) => {
            return createMemberRecord(
                {
                    fullName: validatedData.fullName,
                    email: validatedData.email,
                    phoneNumber: validatedData.phoneNumber,
                    gender: validatedData.gender,
                    regionId: validatedData.regionId,
                    courseId: validatedData.courseId,
                    initialYearOfStudy: validatedData.initialYearOfStudy,
                    initialSemester: validatedData.initialSemester,
                    residenceId: validatedData.residenceId,
                    hostelName: validatedData.hostelName,
                    registrationMode: validatedData.registrationMode,
                    classificationTagId: validatedData.classificationTagId,
                    additionalTagIds: validatedData.additionalTagIds,
                    assignFirstTimerTag: validatedData.assignFirstTimerTag,
                },
                tx,
            );
        }, { timeout: 15000 });

        // Queue welcome email AFTER the transaction commits so that:
        //  - QR code generation cannot timeout the DB transaction
        //  - A failing email queue never rolls back the member creation
        await scheduleWelcomeEmail(member.email, member.fullName, fellowshipNumber, member.qrCode);

        // ── Fetch complete member for response ───────────────────────────────
        const completeMember = await prisma.member.findUnique({
            where: { id: member.id },
            include: {
                region: true,
                courseRelation: true,
                memberTags: { include: { tag: true } },
            },
        });

        const responseData = {
            ...completeMember,
            tags: (completeMember as any).memberTags.map((mt: any) => ({
                ...mt.tag,
                isActive: mt.isActive,
            })),
            memberTags: undefined,
        };

        res.status(201).json({
            message: 'Member registered successfully',
            member: responseData,
            fellowshipNumber,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};




// Get all members with optional search and tag filters
export const getMembers = async (req: Request, res: Response) => {
    try {
        const { search, tags, regionId, page = '1', limit = '50' } = req.query;

        // Pagination setup
        const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
        const parsedLimit = Math.max(1, Math.min(500, parseInt(limit as string, 10) || 50));
        const skip = (parsedPage - 1) * parsedLimit;

        // Parse tag IDs if provided
        const tagIds = tags ? (tags as string).split(',').filter(Boolean) : [];

        const where: any = {
            ...activeMemberFilter
        };

        // Region filter — enforced server-side to prevent client-side bypass
        if (regionId) {
            where.regionId = regionId as string;
        }

        // Search filter
        if (search) {
            where.OR = [
                { fullName: { contains: search as string, mode: 'insensitive' as const } },
                { email: { contains: search as string, mode: 'insensitive' as const } },
                { phoneNumber: { contains: search as string, mode: 'insensitive' as const } },
                { fellowshipNumber: { contains: search as string, mode: 'insensitive' as const } },
            ];
        }

        // Tag filter - members must have ALL specified tags
        if (tagIds.length > 0) {
            where.memberTags = {
                some: {
                    tagId: { in: tagIds },
                    isActive: true,
                },
            };
        }

        const [total, members] = await prisma.$transaction([
            prisma.member.count({ where }),
            prisma.member.findMany({
                where,
                skip,
                take: parsedLimit,
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    fellowshipNumber: true,
                    gender: true,
                    registrationDate: true,
                    initialYearOfStudy: true,
                    initialSemester: true,
                    createdAt: true,
                    region: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    courseRelation: {
                        select: {
                            id: true,
                            name: true,
                            durationYears: true,
                        },
                    },
                    memberTags: {
                        where: { isActive: true },
                        include: {
                            tag: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            })
        ]);

        // Transform to include tag info with isActive status and formatted region names
        const membersWithTags = members.map((member: any) => ({
            ...member,
            region: member.region ? {
                ...member.region,
                name: formatRegionName(member.region.name)
            } : null,
            tags: member.memberTags.map((mt: any) => ({
                ...mt.tag,
                isActive: mt.isActive
            })),
            memberTags: undefined, // Remove the join table data
        }));

        res.json({
            data: membersWithTags,
            meta: {
                total,
                page: parsedPage,
                limit: parsedLimit,
                totalPages: Math.ceil(total / parsedLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
};

/**
 * Get member's current academic status (calculated in real-time)
 */
export const getMemberAcademicStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Type guard: ensure id is a string
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        const member = await prisma.member.findUnique({
            where: { id },
            select: {
                id: true,
                isDeleted: true,
                registrationDate: true,
                initialYearOfStudy: true,
                initialSemester: true,
                courseId: true,
                courseRelation: {
                    select: {
                        id: true,
                        name: true,
                        durationYears: true,
                    },
                },
            },
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (member.isDeleted) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // If no academic data, return null status
        if (!member.registrationDate || !member.initialYearOfStudy || !member.initialSemester) {
            return res.json({
                currentYear: null,
                currentSemester: null,
                isFinalist: false,
                isAlumni: false,
                course: member.courseRelation,
            });
        }

        const academicStatus = await getCurrentAcademicStatus({
            registrationDate: member.registrationDate,
            initialYearOfStudy: member.initialYearOfStudy,
            initialSemester: member.initialSemester,
        });

        const isFinalist = await isMemberFinalist({
            registrationDate: member.registrationDate,
            initialYearOfStudy: member.initialYearOfStudy,
            initialSemester: member.initialSemester,
            courseRelation: member.courseRelation,
        });

        const isAlumni = await isMemberAlumni({
            registrationDate: member.registrationDate,
            initialYearOfStudy: member.initialYearOfStudy,
            initialSemester: member.initialSemester,
            courseRelation: member.courseRelation,
        });

        res.json({
            currentYear: academicStatus.currentYear,
            currentSemester: academicStatus.currentSemester,
            isFinalist,
            isAlumni,
            course: member.courseRelation,
        });
    } catch (error) {
        console.error('Error fetching academic status:', error);
        res.status(500).json({ error: 'Failed to fetch academic status' });
    }
};

// Soft delete a member
export const softDeleteMember = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        // Type guard: ensure id is a string
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        const member = await prisma.member.findUnique({ where: { id } });

        if (!member) return res.status(404).json({ error: 'Member not found' });
        if (member.isDeleted) return res.status(400).json({ error: 'Member is already deleted' });
        if (member.id === userId) return res.status(400).json({ error: 'Cannot delete your own account' });

        await prisma.member.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
        });

        console.log(`[MEMBER] Soft deleted member ${member.fullName} (${member.fellowshipNumber}) by user ${userId}`);
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        console.error('Error soft deleting member:', error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
};

export const bulkSoftDeleteMembers = async (req: Request, res: Response) => {
    try {
        const { memberIds } = req.body;
        const userId = (req as any).user.id;

        if (!Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ error: 'memberIds must be a non-empty array' });
        }

        if (memberIds.includes(userId)) return res.status(400).json({ error: 'Cannot delete your own account' });

        const members = await prisma.member.findMany({
            where: { id: { in: memberIds }, ...activeMemberFilter },
        });

        if (members.length === 0) return res.status(400).json({ error: 'No valid members to delete' });

        const result = await prisma.member.updateMany({
            where: { id: { in: members.map(m => m.id) } },
            data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
        });

        console.log(`[MEMBER] Bulk soft deleted ${result.count} members by user ${userId}`);
        res.json({ message: `${result.count} member(s) deleted successfully`, count: result.count });
    } catch (error) {
        console.error('Error bulk soft deleting members:', error);
        res.status(500).json({ error: 'Failed to delete members' });
    }
};

/**
 * GET /api/members/qr/:qrCodeValue
 * Generate and return QR code image as PNG
 */
export const getQRCodeImage = async (req: Request, res: Response) => {
    try {
        const qrCodeValue = req.params.qrCodeValue as string;

        if (!qrCodeValue) {
            return res.status(400).send('QR code value is required');
        }

        const buffer = await QRCode.toBuffer(qrCodeValue, {
            width: 300,
            margin: 2,
            color: {
                dark: '#14b8a6', // Teal
                light: '#FFFFFF'
            }
        });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'inline; filename="qrcode.png"');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year since value doesn't change
        res.send(buffer);
    } catch (error) {
        console.error('Error serving QR code image:', error);
        res.status(500).send('Failed to generate QR code');
    }
};
