import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import { formatRegionName } from '../utils/displayFormatters';
import { getCurrentAcademicStatus, isMemberFinalist, isMemberAlumni, fetchAllAcademicPeriods, computeCurrentYearFromPeriods } from '../utils/academicProgressionHelper';
import { activeMemberFilter } from '../utils/queryHelpers';
import { Prisma } from '@prisma/client';
import { createMemberRecord } from '../services/memberService';
import { scheduleWelcomeEmail } from '../services/emailService';
import { matchAndAdvanceDirectMemberPledge } from './bringOneController';
import ExcelJS from 'exceljs';
import { PrismaClient } from "@prisma/client";

const createMemberSchema = z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    // Enforce a plausible phone — at least 10 digits, optional + prefix
    phoneNumber: z.string().regex(/^\+?\d{10,15}$/, { message: 'Phone number must be 10–15 digits (optionally prefixed with +)' }),
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
})
.refine(data => {
    // If a course is assigned, academic progress fields are required
    if (!data.courseId) return true;
    return data.initialYearOfStudy !== undefined && data.initialSemester !== undefined;
}, {
    message: "Year of study and semester are required when a course is assigned.",
    path: ["initialYearOfStudy"],
});

// Create new member
export const createMember = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
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
        const { member, fellowshipNumber, temporaryPassword } = await prisma.$transaction(async (tx) => {
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
        await scheduleWelcomeEmail(prisma, member.email, member.fullName, fellowshipNumber, temporaryPassword || '', member.qrCode, undefined);

        // Execute Bring 1 auto-match for direct internal registration
        matchAndAdvanceDirectMemberPledge(prisma, {
            email: member.email,
            phone: member.phoneNumber,
            memberId: member.id,
        }).catch(err => console.error('[BRING-ONE] Auto-match failed for internal reg:', err));

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
            member: {
                ...responseData,
                defaultPassword: temporaryPassword
            },
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
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const { search, tags, regionId, familyId, teamId, page = '1', limit = '50' } = req.query;

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

        // Family filter
        if (familyId) {
            where.familyMemberships = {
                some: {
                    familyId: familyId as string,
                    isActive: true,
                },
            };
        }

        // Team filter
        if (teamId) {
            where.ministryMemberships = {
                some: {
                    teamId: teamId as string,
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

export const exportMembersToExcel = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const { search, tags, regionId, familyId, teamId } = req.query;

        // Parse tag IDs
        const tagIds = tags ? (tags as string).split(',').filter(Boolean) : [];

        const where: any = {
            ...activeMemberFilter
        };

        if (regionId) where.regionId = regionId as string;

        if (search) {
            where.OR = [
                { fullName: { contains: search as string, mode: 'insensitive' as const } },
                { email: { contains: search as string, mode: 'insensitive' as const } },
                { phoneNumber: { contains: search as string, mode: 'insensitive' as const } },
                { fellowshipNumber: { contains: search as string, mode: 'insensitive' as const } },
            ];
        }

        if (tagIds.length > 0) {
            where.memberTags = { some: { tagId: { in: tagIds }, isActive: true } };
        }

        if (familyId) {
            where.familyMemberships = { some: { familyId: familyId as string, isActive: true } };
        }

        if (teamId) {
            where.ministryMemberships = { some: { teamId: teamId as string, isActive: true } };
        }

        const members = await prisma.member.findMany({
            where,
            select: {
                fullName: true,
                email: true,
                phoneNumber: true,
                fellowshipNumber: true,
                gender: true,
                initialYearOfStudy: true,
                initialSemester: true,
                registrationDate: true,
                region: { select: { name: true } },
                courseRelation: { select: { name: true } },
                memberTags: { where: { isActive: true }, include: { tag: true } },
                familyMemberships: { where: { isActive: true }, include: { family: true } },
                ministryMemberships: { where: { isActive: true }, include: { team: true } },
            },
            orderBy: { fullName: 'asc' },
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Filtered Members', {
            properties: { tabColor: { argb: 'FF14b8a6' } }
        });

        // Header
        const headerRow = sheet.addRow([
            'Fellowship #', 'Full Name', 'Gender', 'Email', 'Phone Number',
            'Region', 'Course', 'Year', 'Semester', 'Tags', 'Families', 'Ministry Teams'
        ]);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14b8a6' } };
        headerRow.height = 25;
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
        sheet.autoFilter = 'A1:L1';

        const allPeriods = await fetchAllAcademicPeriods(prisma);

        members.forEach((m, i) => {
            const isAlumni = m.memberTags?.some((mt: any) => mt.tag?.name === 'ALUMNI');
            const currentYear = isAlumni ? null : computeCurrentYearFromPeriods(
                {
                    registrationDate: m.registrationDate || new Date(),
                    initialYearOfStudy: m.initialYearOfStudy,
                    initialSemester: m.initialSemester
                },
                allPeriods
            );

            const row = sheet.addRow([
                m.fellowshipNumber,
                m.fullName,
                m.gender,
                m.email,
                m.phoneNumber,
                m.region?.name ? formatRegionName(m.region.name) : '-',
                m.courseRelation?.name || '-',
                currentYear || '-',
                m.initialSemester || '-',
                m.memberTags.map((mt: any) => mt.tag.name.replace(/_/g, ' ')).join(', ') || '-',
                m.familyMemberships.map((fm: any) => fm.family.name).join(', ') || '-',
                m.ministryMemberships.map((mm: any) => mm.team.name).join(', ') || '-'
            ]);
            
            if (i % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
        });

        sheet.columns = [
            { width: 15 }, { width: 30 }, { width: 10 }, { width: 25 }, { width: 18 },
            { width: 20 }, { width: 35 }, { width: 8 }, { width: 10 }, { width: 25 },
            { width: 25 }, { width: 25 }
        ];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="members_export.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting members:', error);
        res.status(500).json({ error: 'Failed to export members' });
    }
};

/**
 * Get member's current academic status (calculated in real-time)
 */
export const getMemberAcademicStatus = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
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

        const academicStatus = await getCurrentAcademicStatus(prisma, {
            registrationDate: member.registrationDate,
            initialYearOfStudy: member.initialYearOfStudy,
            initialSemester: member.initialSemester,
        });

        const isFinalist = await isMemberFinalist(prisma, {
            registrationDate: member.registrationDate,
            initialYearOfStudy: member.initialYearOfStudy,
            initialSemester: member.initialSemester,
            courseRelation: member.courseRelation,
        });

        const isAlumni = await isMemberAlumni(prisma, {
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
    const prisma = (req as any).prisma as PrismaClient;
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
    const prisma = (req as any).prisma as PrismaClient;
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
    const prisma = (req as any).prisma as PrismaClient;
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
