import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../prisma';
import { generateFellowshipNumber } from '../utils/fellowshipNumberGenerator';
import { formatRegionName } from '../utils/displayFormatters';
import { updateFinalistTag } from '../utils/finalistHelper';
import { getCurrentAcademicStatus, isMemberFinalist, isMemberAlumni } from '../utils/academicProgressionHelper';
import { sendWelcomeEmail } from '../services/emailService';

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

        // Prepare tag connections
        const tagConnections = [];

        // Add classification tag if provided
        if (validatedData.classificationTagId) {
            tagConnections.push({
                tagId: validatedData.classificationTagId,
                isActive: true,
            });
        }

        // Add additional tags if provided
        if (validatedData.additionalTagIds && validatedData.additionalTagIds.length > 0) {
            tagConnections.push(
                ...validatedData.additionalTagIds.map((tagId) => ({
                    tagId,
                    isActive: true,
                }))
            );
        }

        // Determine registration mode (default to NEW_MEMBER)
        const registrationMode = validatedData.registrationMode || 'NEW_MEMBER';

        // Create the member first without tags
        const member = await prisma.member.create({
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

        // Determine if should assign first-timer tag
        const shouldAssignFirstTimerTag = validatedData.assignFirstTimerTag !== undefined
            ? validatedData.assignFirstTimerTag
            : registrationMode === 'NEW_MEMBER'; // Auto-assign only for NEW_MEMBER mode

        // Add first-timer tag if applicable
        if (shouldAssignFirstTimerTag) {
            const firstTimerTag = await prisma.tag.findUnique({
                where: { name: 'PENDING_FIRST_ATTENDANCE' },
            });

            if (firstTimerTag) {
                tagConnections.push({
                    tagId: firstTimerTag.id,
                    isActive: true,
                });
            }
        }

        // Add tags after member is created (so we can use member.id as assignedBy)
        if (tagConnections.length > 0) {
            await prisma.memberTag.createMany({
                data: tagConnections.map(tc => ({
                    memberId: member.id,
                    tagId: tc.tagId,
                    assignedBy: member.id, // Self-assigned during registration
                    isActive: tc.isActive,
                })),
            });
        }

        // Update finalist tag if applicable
        if (validatedData.courseId && validatedData.initialYearOfStudy && validatedData.initialSemester) {
            // Use member.id as assignedBy since this is the registration process
            await updateFinalistTag(member.id, member.id);
        }

        // Fetch the complete member with all relations
        const completeMember = await prisma.member.findUnique({
            where: { id: member.id },
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

        // Transform response to match expected format
        const responseData = {
            ...completeMember,
            tags: (completeMember as any).memberTags.map((mt: any) => ({
                ...mt.tag,
                isActive: mt.isActive,
            })),
            memberTags: undefined,
        };

        // Send welcome email with QR code (non-blocking - don't wait for result)
        sendWelcomeEmail(
            completeMember!.email,
            completeMember!.fullName,
            fellowshipNumber,
            completeMember!.qrCode
        ).then(success => {
            if (success) {
                console.log(`[REGISTRATION] Welcome email sent to ${completeMember!.email}`);
            } else {
                console.error(`[REGISTRATION] Failed to send welcome email to ${completeMember!.email}`);
            }
        }).catch(err => {
            console.error('[REGISTRATION] Welcome email error:', err);
        });

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

        const where: any = {};

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

        const member = await prisma.member.findUnique({
            where: { id },
            select: {
                id: true,
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
