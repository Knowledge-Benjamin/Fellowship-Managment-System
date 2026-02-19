import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../prisma';
import { generateFellowshipNumber } from '../utils/fellowshipNumberGenerator';
import { formatRegionName } from '../utils/displayFormatters';
import { updateMemberTags } from '../utils/finalistHelper';
import { getCurrentAcademicStatus, isMemberFinalist, isMemberAlumni } from '../utils/academicProgressionHelper';
import { sendWelcomeEmail, queueWelcomeEmail } from '../services/emailService';
import { activeMemberFilter } from '../utils/queryHelpers';
import { Prisma } from '@prisma/client';

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
// Create new member
export const createMember = async (req: Request, res: Response) => {
    try {
        const validatedData = createMemberSchema.parse(req.body);

        // Check if email already exists
        const existingMember = await prisma.member.findUnique({
            where: { email: validatedData.email },
        });

        if (existingMember) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Verify region exists
        const region = await prisma.region.findUnique({
            where: { id: validatedData.regionId },
        });

        if (!region) {
            return res.status(400).json({ error: 'Invalid region' });
        }

        // Validate course if provided
        if (validatedData.courseId) {
            const course = await prisma.course.findUnique({
                where: { id: validatedData.courseId },
            });

            if (!course) {
                return res.status(400).json({ error: 'Invalid course' });
            }
        }

        // Generate unique fellowship number
        const fellowshipNumber = await generateFellowshipNumber();

        // Hash the fellowship number to use as default password
        const hashedPassword = await bcrypt.hash(fellowshipNumber, 10);

        // --- TRANSACTION START ---
        // Perform all writes atomically: Member, Tags, and Email Queue
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Member
            const registrationMode = validatedData.registrationMode || 'NEW_MEMBER';

            const member = await tx.member.create({
                data: {
                    fullName: validatedData.fullName,
                    email: validatedData.email,
                    phoneNumber: validatedData.phoneNumber,
                    gender: validatedData.gender,
                    password: hashedPassword,
                    fellowshipNumber,
                    regionId: validatedData.regionId,
                    courseId: validatedData.courseId,
                    initialYearOfStudy: validatedData.initialYearOfStudy,
                    initialSemester: validatedData.initialSemester,
                    residenceId: validatedData.residenceId,
                    hostelName: validatedData.hostelName,
                    registrationMode,
                },
                include: {
                    region: true,
                    courseRelation: true,
                },
            });

            // 2. Prepare Tags
            const tagConnections = [];

            // Classification Tag
            if (validatedData.classificationTagId) {
                tagConnections.push({
                    tagId: validatedData.classificationTagId,
                    isActive: true,
                });
            }

            // Additional Tags
            if (validatedData.additionalTagIds && validatedData.additionalTagIds.length > 0) {
                tagConnections.push(
                    ...validatedData.additionalTagIds.map((tagId) => ({
                        tagId,
                        isActive: true,
                    }))
                );
            }

            // First Timer Tag
            const shouldAssignFirstTimerTag = validatedData.assignFirstTimerTag !== undefined
                ? validatedData.assignFirstTimerTag
                : registrationMode === 'NEW_MEMBER';

            if (shouldAssignFirstTimerTag) {
                const firstTimerTag = await tx.tag.findUnique({
                    where: { name: 'PENDING_FIRST_ATTENDANCE' },
                });

                if (firstTimerTag) {
                    tagConnections.push({
                        tagId: firstTimerTag.id,
                        isActive: true,
                    });
                }
            }

            // Assign Tags
            if (tagConnections.length > 0) {
                await tx.memberTag.createMany({
                    data: tagConnections.map(tc => ({
                        memberId: member.id,
                        tagId: tc.tagId,
                        assignedBy: member.id,
                        isActive: tc.isActive,
                    })),
                });
            }

            // 3. Update Finalist/Alumni Tags (using the transaction client)
            if (validatedData.courseId && validatedData.initialYearOfStudy && validatedData.initialSemester) {
                await updateMemberTags(member.id, member.id, tx);
            }

            // 4. Queue Welcome Email (Atomic with registration)
            await queueWelcomeEmail(
                tx,
                member.email,
                member.fullName,
                fellowshipNumber,
                member.qrCode
            );

            return member;
        });
        // --- TRANSACTION END ---

        // Fetch complete member for response (outside transaction is fine)
        const completeMember = await prisma.member.findUnique({
            where: { id: result.id },
            include: {
                region: true,
                courseRelation: true,
                memberTags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });

        // Transform response
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
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues,
            });
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};


// Get all members with optional search and tag filters
export const getMembers = async (req: Request, res: Response) => {
    try {
        const { search, tags } = req.query;

        // Parse tag IDs if provided
        const tagIds = tags ? (tags as string).split(',').filter(Boolean) : [];

        const where: any = {
            ...activeMemberFilter
        };

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

        const members = await prisma.member.findMany({
            where,
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
        });

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

        res.json(membersWithTags);
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
