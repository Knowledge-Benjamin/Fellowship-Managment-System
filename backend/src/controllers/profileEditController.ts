import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { formatRegionName } from '../utils/displayFormatters';
import {
    sendProfileEditRequestNotification,
    sendProfileEditDecisionNotification,
} from '../services/emailService';

// ── Validation Schemas ──────────────────────────────────────────────────────

const EDITABLE_FIELDS = [
    'phoneNumber', 'fullName', 'email',
    'courseId', 'collegeId',
    'initialYearOfStudy', 'initialSemester',
    'residenceId', 'hostelName',
] as const;
type EditableField = typeof EDITABLE_FIELDS[number];

// Fields stored as relations (need special handling on apply)
const RELATION_FIELDS: Partial<Record<EditableField, string>> = {
    courseId: 'courseId',
    residenceId: 'residenceId',
};

const changeSchema = z.object({
    field: z.enum(EDITABLE_FIELDS),
    newValue: z.string().min(1, 'New value cannot be empty'),
});

const submitRequestSchema = z.object({
    changes: z.array(changeSchema).min(1, 'At least one change is required').max(9),
    reason: z.string().min(10, 'Please explain the reason for the change (min 10 characters)').max(500),
});

const directUpdateSchema = z.object({
    fullName: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().min(5).max(20).optional(),
    courseId: z.string().optional(),
    initialYearOfStudy: z.number().int().min(1).max(10).optional(),
    initialSemester: z.number().int().min(1).max(2).optional(),
    residenceId: z.string().optional(),
    hostelName: z.string().max(100).optional(),
});

const reviewRequestSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    reviewNote: z.string().max(500).optional(),
});

// ── Helper: snapshot current field values ───────────────────────────────────

async function getMemberProfile(memberId: string) {
    return prisma.member.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            fellowshipNumber: true,
            hostelName: true,
            courseId: true,
            initialYearOfStudy: true,
            initialSemester: true,
            courseRelation: {
                select: {
                    id: true,
                    name: true,
                    durationYears: true,
                    college: { select: { id: true, name: true, code: true } },
                },
            },
            residence: { select: { id: true, name: true, type: true } },
            region: { select: { id: true, name: true, regionalHeadId: true } },
            familyMemberships: {
                where: { isActive: true },
                include: {
                    family: { select: { id: true, name: true } },
                },
                take: 1,
            },
        },
    });
}

// ── GET /members/me ─────────────────────────────────────────────────────────

export const getMyProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const member = await getMemberProfile(userId);
        if (!member || (member as any).isDeleted) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // Attach the pending edit request if any
        const pendingRequest = await prisma.profileEditRequest.findFirst({
            where: { memberId: userId, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
        });

        const family = member.familyMemberships?.[0]?.family ?? null;
        const course = member.courseRelation ?? null;
        const residence = member.residence ?? null;

        res.json({
            id: member.id,
            fullName: member.fullName,
            email: member.email,
            phoneNumber: member.phoneNumber,
            fellowshipNumber: member.fellowshipNumber,
            hostelName: member.hostelName ?? null,
            region: member.region
                ? { ...member.region, name: formatRegionName(member.region.name) }
                : null,
            family,
            residence,
            academic: course
                ? {
                    courseId: course.id ?? null,
                    courseName: course.name ?? null,
                    collegeId: course.college?.id ?? null,
                    collegeName: course.college?.name ?? null,
                    collegeCode: course.college?.code ?? null,
                    durationYears: course.durationYears ?? null,
                    currentYear: member.initialYearOfStudy ?? null,
                    currentSemester: member.initialSemester ?? null,
                }
                : null,
            pendingEditRequest: pendingRequest
                ? {
                    id: pendingRequest.id,
                    status: pendingRequest.status,
                    changes: pendingRequest.changes,
                    reason: pendingRequest.reason,
                    createdAt: pendingRequest.createdAt,
                }
                : null,
        });
    } catch (error) {
        console.error('[PROFILE] Error fetching own profile:', error);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
};

// ── POST /members/me/edit-request ───────────────────────────────────────────

export const submitEditRequest = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const validatedData = submitRequestSchema.parse(req.body);

        // Block if already has a pending request
        const existingPending = await prisma.profileEditRequest.findFirst({
            where: { memberId: userId, status: 'PENDING' },
        });
        if (existingPending) {
            return res.status(409).json({
                message: 'You already have a pending edit request. Please wait for it to be reviewed before submitting another.',
            });
        }

        // Fetch current member to capture old values
        const member = await getMemberProfile(userId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        // Build a flat snapshot for old-value lookup
        const fieldSnapshot: Record<string, string> = {
            fullName: member.fullName ?? '',
            email: member.email ?? '',
            phoneNumber: member.phoneNumber ?? '',
            hostelName: member.hostelName ?? '',
            residenceId: member.residence?.id ?? '',
            courseId: member.courseRelation?.id ?? '',
            collegeId: member.courseRelation?.college?.id ?? '',
            initialYearOfStudy: String(member.initialYearOfStudy ?? ''),
            initialSemester: String(member.initialSemester ?? ''),
        };

        // Build changes array with old values captured from current data
        const changesWithOldValues = validatedData.changes.map((change) => ({
            field: change.field,
            oldValue: fieldSnapshot[change.field] ?? '',
            newValue: change.newValue,
        }));

        // Validate no-op changes
        const actualChanges = changesWithOldValues.filter(
            (c) => c.oldValue !== c.newValue
        );
        if (actualChanges.length === 0) {
            return res.status(400).json({
                message: 'No actual changes detected. The new values are the same as the current values.',
            });
        }

        // Create the request
        const editRequest = await prisma.profileEditRequest.create({
            data: {
                memberId: userId,
                changes: actualChanges,
                reason: validatedData.reason,
                status: 'PENDING',
            },
        });

        // Notify the regional head by email (fire-and-forget)
        if (member.region?.regionalHeadId) {
            const regionalHead = await prisma.member.findUnique({
                where: { id: member.region.regionalHeadId },
                select: { email: true, fullName: true },
            });
            if (regionalHead) {
                sendProfileEditRequestNotification(
                    regionalHead.email,
                    regionalHead.fullName,
                    member.fullName,
                    member.fellowshipNumber,
                    actualChanges,
                    validatedData.reason
                ).catch((err) =>
                    console.error('[PROFILE] Failed to send RH notification email:', err)
                );
            }
        }

        console.log(
            `[PROFILE] Edit request submitted by ${member.fullName} (${member.fellowshipNumber}), id: ${editRequest.id}`
        );

        res.status(201).json({
            message: 'Edit request submitted successfully. Your Regional Head will review it.',
            requestId: editRequest.id,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', details: error.issues });
        }
        console.error('[PROFILE] Error submitting edit request:', error);
        res.status(500).json({ message: 'Failed to submit edit request' });
    }
};

// ── GET /members/edit-requests ──────────────────────────────────────────────
// Regional Head: view pending requests from members in their region.
// Fellowship Manager: view all pending requests.

export const getEditRequests = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { status = 'PENDING' } = req.query;
        const statusFilter = (status as string).toUpperCase();

        if (!['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(statusFilter)) {
            return res.status(400).json({ message: 'Invalid status filter' });
        }

        let regionFilter: string | null = null;

        if (userRole !== 'FELLOWSHIP_MANAGER') {
            // For non-managers, scope to the region they head
            const headedRegion = await prisma.region.findFirst({
                where: { regionalHeadId: userId },
                select: { id: true },
            });
            if (!headedRegion) {
                return res.status(403).json({
                    message: 'Only Regional Heads and Fellowship Managers can review edit requests.',
                });
            }
            regionFilter = headedRegion.id;
        }

        const requests = await prisma.profileEditRequest.findMany({
            where: {
                ...(statusFilter !== 'ALL' ? { status: statusFilter as any } : {}),
                member: {
                    isDeleted: false,
                    ...(regionFilter ? { regionId: regionFilter } : {}),
                },
            },
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        fellowshipNumber: true,
                        region: { select: { id: true, name: true } },
                    },
                },
                reviewer: {
                    select: { id: true, fullName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formatted = requests.map((r) => ({
            ...r,
            member: r.member
                ? {
                    ...r.member,
                    region: r.member.region
                        ? { ...r.member.region, name: formatRegionName(r.member.region.name) }
                        : null,
                }
                : null,
        }));

        res.json(formatted);
    } catch (error) {
        console.error('[PROFILE] Error fetching edit requests:', error);
        res.status(500).json({ message: 'Failed to fetch edit requests' });
    }
};

// ── PATCH /members/edit-requests/:id ───────────────────────────────────────
// Approve or reject an edit request.

export const reviewEditRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const reviewerId = req.user?.id;
        const reviewerRole = req.user?.role;

        if (!reviewerId) return res.status(401).json({ message: 'Unauthorized' });
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ message: 'Invalid request ID' });
        }

        const validatedData = reviewRequestSchema.parse(req.body);

        // Fetch the edit request with member + region info
        const editRequest = await prisma.profileEditRequest.findUnique({
            where: { id },
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        fellowshipNumber: true,
                        regionId: true,
                        region: { select: { id: true, name: true, regionalHeadId: true } },
                    },
                },
            },
        });

        if (!editRequest) {
            return res.status(404).json({ message: 'Edit request not found' });
        }
        if (editRequest.status !== 'PENDING') {
            return res.status(409).json({
                message: `This request has already been ${editRequest.status.toLowerCase()}.`,
            });
        }

        // Authorization: only the RH for this member's region or FM can review
        if (reviewerRole !== 'FELLOWSHIP_MANAGER') {
            const headedRegion = await prisma.region.findFirst({
                where: { regionalHeadId: reviewerId },
                select: { id: true },
            });
            if (!headedRegion || headedRegion.id !== editRequest.member?.regionId) {
                return res.status(403).json({
                    message: 'You are not authorized to review this request.',
                });
            }
        }

        // Reviewer cannot approve their own request
        if (editRequest.memberId === reviewerId) {
            return res.status(403).json({ message: 'You cannot review your own edit request.' });
        }

        // Perform approval in a transaction
        if (validatedData.status === 'APPROVED') {
            const changes = editRequest.changes as Array<{
                field: string;
                oldValue: string;
                newValue: string;
            }>;

            // Build the update payload — only allow known safe fields
            const updateData: Record<string, any> = {};
            const academicUpdate: Record<string, any> = {};

            for (const change of changes) {
                if (!EDITABLE_FIELDS.includes(change.field as EditableField)) continue;

                if (change.field === 'courseId') {
                    academicUpdate.courseId = change.newValue;
                } else if (change.field === 'collegeId') {
                    // collegeId is informational — actual change is on the course
                    // skip direct member field update; courseId change handles it
                } else if (change.field === 'initialYearOfStudy') {
                    academicUpdate.currentYear = parseInt(change.newValue, 10);
                } else if (change.field === 'initialSemester') {
                    academicUpdate.currentSemester = parseInt(change.newValue, 10);
                } else if (change.field === 'residenceId') {
                    updateData.residenceId = change.newValue;
                } else {
                    // Direct member fields: fullName, email, phoneNumber, hostelName
                    updateData[change.field] = change.newValue;
                }
            }

            if (Object.keys(updateData).length === 0 && Object.keys(academicUpdate).length === 0) {
                return res.status(400).json({ message: 'No valid fields to update.' });
            }

            await prisma.$transaction(async (tx) => {
                // All changes go directly to the member table
                const allUpdateData: Record<string, any> = { ...updateData };

                // academicUpdate fields are direct Member fields too
                if (academicUpdate.courseId !== undefined) allUpdateData.courseId = academicUpdate.courseId;
                if (academicUpdate.currentYear !== undefined) allUpdateData.initialYearOfStudy = academicUpdate.currentYear;
                if (academicUpdate.currentSemester !== undefined) allUpdateData.initialSemester = academicUpdate.currentSemester;

                if (Object.keys(allUpdateData).length > 0) {
                    await tx.member.update({
                        where: { id: editRequest.memberId },
                        data: allUpdateData,
                    });
                }

                // Mark request as APPROVED
                await tx.profileEditRequest.update({
                    where: { id },
                    data: {
                        status: 'APPROVED',
                        reviewedBy: reviewerId,
                        reviewNote: validatedData.reviewNote ?? null,
                        reviewedAt: new Date(),
                    },
                });
            });
        } else {
            // REJECTED — no profile changes, just update the request record
            await prisma.profileEditRequest.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    reviewedBy: reviewerId,
                    reviewNote: validatedData.reviewNote ?? null,
                    reviewedAt: new Date(),
                },
            });
        }

        // Notify the member of the decision (fire-and-forget)
        if (editRequest.member) {
            sendProfileEditDecisionNotification(
                editRequest.member.email,
                editRequest.member.fullName,
                validatedData.status,
                editRequest.changes as any,
                validatedData.reviewNote
            ).catch((err) =>
                console.error('[PROFILE] Failed to send decision email:', err)
            );
        }

        console.log(
            `[PROFILE] Edit request ${id} ${validatedData.status} by reviewer ${reviewerId}`
        );

        res.json({
            message: `Edit request ${validatedData.status.toLowerCase()} successfully.`,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', details: error.issues });
        }
        console.error('[PROFILE] Error reviewing edit request:', error);
        res.status(500).json({ message: 'Failed to review edit request' });
    }
};

// ── PATCH /members/me ───────────────────────────────────────────────────────
// Fellowship Manager direct self-edit (no approval required).

export const updateMyProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (userRole !== 'FELLOWSHIP_MANAGER') {
            return res.status(403).json({ message: 'Only the Fellowship Manager can use this endpoint.' });
        }

        const validatedData = directUpdateSchema.parse(req.body);

        const {
            courseId,
            initialYearOfStudy,
            initialSemester,
            ...memberFields
        } = validatedData;

        const updatePayload: Record<string, any> = { ...memberFields };
        if (courseId !== undefined) updatePayload.courseId = courseId;
        if (initialYearOfStudy !== undefined) updatePayload.initialYearOfStudy = initialYearOfStudy;
        if (initialSemester !== undefined) updatePayload.initialSemester = initialSemester;

        if (Object.keys(updatePayload).length > 0) {
            await prisma.member.update({
                where: { id: userId },
                data: updatePayload,
            });
        }

        res.json({ message: 'Profile updated successfully.' });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', details: error.issues });
        }
        console.error('[PROFILE] Error updating own profile:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};
