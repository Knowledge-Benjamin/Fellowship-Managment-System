import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../prisma';
import { generateFellowshipNumber } from '../utils/fellowshipNumberGenerator';
import { updateMemberTags } from '../utils/finalistHelper';
import { queueWelcomeEmail } from '../services/emailService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createTokenSchema = z.object({
    label: z.string().optional(),
    expiresAt: z.string().datetime({ message: 'Invalid date format — use ISO 8601' }),
    maxUses: z.number().int().positive().optional(),
});

const selfRegSubmitSchema = z.object({
    token: z.string().min(1),
    fullName: z.string().min(2),
    email: z.string().email(),
    phoneNumber: z.string().min(7),
    gender: z.enum(['MALE', 'FEMALE']),
    isMakerereStudent: z.boolean().default(true),
    registrationMode: z.enum(['NEW_MEMBER', 'READMISSION']).default('NEW_MEMBER'),
    regionId: z.string().uuid().optional(),
    // Academic — resolved IDs or freetext
    collegeId: z.string().uuid().optional(),
    collegeSuggestion: z.string().optional(),
    courseId: z.string().uuid().optional(),
    courseSuggestion: z.string().optional(),
    initialYearOfStudy: z.number().int().min(1).max(7).optional(),
    initialSemester: z.number().int().min(1).max(2).optional(),
    // Residence
    residenceId: z.string().uuid().optional(),
    residenceSuggestion: z.string().optional(),
    hostelName: z.string().optional(),
});

// ─── Token Management (FM only) ───────────────────────────────────────────────

/**
 * POST /api/reg-tokens
 * Create a new registration token
 */
export const createToken = async (req: Request, res: Response) => {
    try {
        const data = createTokenSchema.parse(req.body);
        const memberId = (req as any).user?.id;

        const token = crypto.randomBytes(32).toString('hex');

        const regToken = await prisma.registrationToken.create({
            data: {
                token,
                label: data.label,
                createdBy: memberId,
                expiresAt: new Date(data.expiresAt),
                maxUses: data.maxUses ?? null,
            },
        });

        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?token=${token}`;

        res.status(201).json({ ...regToken, url });
    } catch (error: any) {
        if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
        console.error('[REG-TOKEN] Create error:', error);
        res.status(500).json({ error: 'Failed to create registration token' });
    }
};

/**
 * GET /api/reg-tokens
 * List all tokens with pending count
 */
export const listTokens = async (_req: Request, res: Response) => {
    try {
        const tokens = await prisma.registrationToken.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { pendingMembers: true } },
            },
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const result = tokens.map(t => ({
            ...t,
            url: `${baseUrl}/register?token=${t.token}`,
            pendingCount: t._count.pendingMembers,
        }));

        res.json(result);
    } catch (error) {
        console.error('[REG-TOKEN] List error:', error);
        res.status(500).json({ error: 'Failed to load tokens' });
    }
};

/**
 * PATCH /api/reg-tokens/:id/revoke
 * Revoke (deactivate) a token
 */
export const revokeToken = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const token = await prisma.registrationToken.update({
            where: { id },
            data: { isActive: false },
        });
        res.json(token);
    } catch (error) {
        console.error('[REG-TOKEN] Revoke error:', error);
        res.status(500).json({ error: 'Failed to revoke token' });
    }
};

// ─── Public Endpoints ─────────────────────────────────────────────────────────

/**
 * GET /api/register/validate?token=
 * Validate a token before showing the registration form
 */
export const validateToken = async (req: Request, res: Response) => {
    const { token } = req.query as { token?: string };

    if (!token) return res.status(400).json({ valid: false, reason: 'Token is required' });

    const regToken = await prisma.registrationToken.findUnique({ where: { token } });

    if (!regToken) return res.status(404).json({ valid: false, reason: 'Invalid registration link' });
    if (!regToken.isActive) return res.status(410).json({ valid: false, reason: 'This registration link has been deactivated' });
    if (regToken.expiresAt < new Date()) return res.status(410).json({ valid: false, reason: 'This registration link has expired' });
    if (regToken.maxUses !== null && regToken.usedCount >= regToken.maxUses) {
        return res.status(410).json({ valid: false, reason: 'This registration link has reached its maximum uses' });
    }

    res.json({ valid: true, label: regToken.label });
};

/**
 * POST /api/register
 * Submit a self-registration (public, no auth)
 */
export const submitSelfReg = async (req: Request, res: Response) => {
    try {
        const data = selfRegSubmitSchema.parse(req.body);
        const ipAddress = (Array.isArray(req.ip) ? req.ip[0] : req.ip) ?? req.socket?.remoteAddress ?? 'unknown';

        // 1. Validate token
        const regToken = await prisma.registrationToken.findUnique({ where: { token: data.token } });
        if (!regToken || !regToken.isActive || regToken.expiresAt < new Date()) {
            return res.status(410).json({ error: 'This registration link is no longer valid' });
        }
        if (regToken.maxUses !== null && regToken.usedCount >= regToken.maxUses) {
            return res.status(410).json({ error: 'This registration link has reached its limit' });
        }

        // 2. Duplicate email checks
        const [existingPending, existingMember] = await Promise.all([
            prisma.pendingMember.findUnique({ where: { email: data.email } }),
            prisma.member.findUnique({ where: { email: data.email } }),
        ]);

        if (existingMember) {
            return res.status(409).json({ error: 'An account with this email is already registered. Please use the login page.' });
        }
        if (existingPending) {
            return res.status(409).json({ error: 'A registration with this email is already pending review. Check your email for confirmation.' });
        }

        // 3. Create PendingMember + increment usedCount atomically
        const pending = await prisma.$transaction(async (tx) => {
            const pm = await tx.pendingMember.create({
                data: {
                    tokenId: regToken.id,
                    fullName: data.fullName,
                    email: data.email,
                    phoneNumber: data.phoneNumber,
                    gender: data.gender,
                    isMakerereStudent: data.isMakerereStudent,
                    registrationMode: data.registrationMode,
                    regionId: data.regionId ?? null,
                    collegeId: data.collegeId ?? null,
                    collegeSuggestion: data.collegeSuggestion ?? null,
                    courseId: data.courseId ?? null,
                    courseSuggestion: data.courseSuggestion ?? null,
                    initialYearOfStudy: data.initialYearOfStudy ?? null,
                    initialSemester: data.initialSemester ?? null,
                    residenceId: data.residenceId ?? null,
                    residenceSuggestion: data.residenceSuggestion ?? null,
                    hostelName: data.hostelName ?? null,
                    ipAddress,
                },
            });

            await tx.registrationToken.update({
                where: { id: regToken.id },
                data: { usedCount: { increment: 1 } },
            });

            // Queue confirmation email
            await tx.emailQueue.create({
                data: {
                    email: data.email,
                    subject: 'Registration Received — Manifest Fellowship',
                    html: buildConfirmationEmailHtml(data.fullName),
                    text: `Hello ${data.fullName}, we received your registration. Our team will review it and activate your account shortly.`,
                },
            });

            return pm;
        }, { timeout: 15000 });

        res.status(201).json({
            message: 'Registration submitted successfully. We\'ll review your details and activate your account.',
            id: pending.id,
        });
    } catch (error: any) {
        if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
        console.error('[SELF-REG] Submit error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
};

// ─── FM Pending Approvals ─────────────────────────────────────────────────────

/**
 * GET /api/pending-members
 */
export const listPendingMembers = async (_req: Request, res: Response) => {
    try {
        const pending = await prisma.pendingMember.findMany({
            where: { status: 'PENDING' },
            orderBy: { submittedAt: 'desc' },
            include: { region: true, token: { select: { label: true, token: true } } },
        });
        res.json(pending);
    } catch (error) {
        console.error('[PENDING] List error:', error);
        res.status(500).json({ error: 'Failed to load pending members' });
    }
};

/**
 * PATCH /api/pending-members/:id
 * FM edits fields on a pending submission before approval
 */
export const updatePendingMember = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            fullName, email, phoneNumber, gender, regionId,
            collegeId, collegeSuggestion, courseId, courseSuggestion,
            initialYearOfStudy, initialSemester,
            residenceId, residenceSuggestion, hostelName,
        } = req.body;

        const updated = await prisma.pendingMember.update({
            where: { id },
            data: {
                ...(fullName && { fullName }),
                ...(email && { email }),
                ...(phoneNumber && { phoneNumber }),
                ...(gender && { gender }),
                ...(regionId !== undefined && { regionId }),
                ...(collegeId !== undefined && { collegeId }),
                ...(collegeSuggestion !== undefined && { collegeSuggestion }),
                ...(courseId !== undefined && { courseId }),
                ...(courseSuggestion !== undefined && { courseSuggestion }),
                ...(initialYearOfStudy !== undefined && { initialYearOfStudy }),
                ...(initialSemester !== undefined && { initialSemester }),
                ...(residenceId !== undefined && { residenceId }),
                ...(residenceSuggestion !== undefined && { residenceSuggestion }),
                ...(hostelName !== undefined && { hostelName }),
            },
            include: { region: true },
        });
        res.json(updated);
    } catch (error) {
        console.error('[PENDING] Update error:', error);
        res.status(500).json({ error: 'Failed to update record' });
    }
};

/**
 * POST /api/pending-members/:id/approve
 * Approve a pending member — creates a real Member record
 */
export const approvePendingMember = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const reviewerId = String((req as any).user?.id ?? '');

        const pending = await prisma.pendingMember.findUnique({
            where: { id },
            include: { region: true },
        });

        if (!pending) return res.status(404).json({ error: 'Pending registration not found' });
        if (pending.status !== 'PENDING') return res.status(400).json({ error: 'This registration has already been reviewed' });
        if (!pending.regionId) return res.status(400).json({ error: 'Region must be assigned before approving' });

        // Resolve college suggestion → create if needed
        let resolvedCollegeId = pending.collegeId;
        if (!resolvedCollegeId && pending.collegeSuggestion) {
            const existing = await prisma.college.findFirst({ where: { name: { equals: pending.collegeSuggestion, mode: 'insensitive' } } });
            if (existing) {
                resolvedCollegeId = existing.id;
            } else {
                const newCollege = await prisma.college.create({ data: { name: pending.collegeSuggestion } });
                resolvedCollegeId = newCollege.id;
            }
        }

        // Resolve course suggestion → create if needed
        let resolvedCourseId = pending.courseId;
        if (!resolvedCourseId && pending.courseSuggestion) {
            const existing = await prisma.course.findFirst({ where: { name: { equals: pending.courseSuggestion, mode: 'insensitive' } } });
            if (existing) {
                resolvedCourseId = existing.id;
            } else {
                // Generate unique code: first 3 letters of name + random 3-digit suffix
                const baseCode = pending.courseSuggestion.replace(/\s/g, '').substring(0, 3).toUpperCase();
                const code = `${baseCode}${Math.floor(100 + Math.random() * 900)}`;
                const newCourse = await prisma.course.create({
                    data: {
                        name: pending.courseSuggestion,
                        code,
                        ...(resolvedCollegeId && { collegeId: resolvedCollegeId }),
                    },
                });
                resolvedCourseId = newCourse.id;
            }
        }

        // Resolve residence suggestion → create if needed
        let resolvedResidenceId = pending.residenceId;
        if (!resolvedResidenceId && pending.residenceSuggestion) {
            const existing = await prisma.residence.findFirst({ where: { name: { equals: pending.residenceSuggestion, mode: 'insensitive' } } });
            if (existing) {
                resolvedResidenceId = existing.id;
            } else {
                const newRes = await prisma.residence.create({ data: { name: pending.residenceSuggestion } });
                resolvedResidenceId = newRes.id;
            }
        }

        const fellowshipNumber = await generateFellowshipNumber();
        const hashedPassword = await bcrypt.hash(fellowshipNumber, 10);

        const member = await prisma.$transaction(async (tx) => {
            const created = await tx.member.create({
                data: {
                    fullName: pending.fullName,
                    email: pending.email,
                    phoneNumber: pending.phoneNumber,
                    gender: pending.gender,
                    password: hashedPassword,
                    fellowshipNumber,
                    regionId: pending.regionId!,
                    registrationMode: pending.registrationMode,
                    ...(resolvedCourseId && { courseId: resolvedCourseId }),
                    ...(pending.initialYearOfStudy && { initialYearOfStudy: pending.initialYearOfStudy }),
                    ...(pending.initialSemester && { initialSemester: pending.initialSemester }),
                    ...(resolvedResidenceId && { residenceId: resolvedResidenceId }),
                    ...(pending.hostelName && { hostelName: pending.hostelName }),
                },
                include: { region: true, courseRelation: true },
            });

            // Assign PENDING_FIRST_ATTENDANCE tag for new members
            if (pending.registrationMode === 'NEW_MEMBER') {
                const tag = await tx.tag.findUnique({ where: { name: 'PENDING_FIRST_ATTENDANCE' } });
                if (tag) {
                    await tx.memberTag.create({
                        data: { memberId: created.id, tagId: tag.id, assignedBy: created.id, isActive: true },
                    });
                }
            }

            // Update finalist/alumni tags if academic info present
            if (resolvedCourseId && pending.initialYearOfStudy && pending.initialSemester) {
                await updateMemberTags(created.id, created.id, tx);
            }

            // Queue welcome email
            await queueWelcomeEmail(tx, created.email, created.fullName, fellowshipNumber, created.qrCode);

            // Mark pending as approved
            await tx.pendingMember.update({
                where: { id: pending.id },
                data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date() },
            });

            return created;
        }, { timeout: 15000 });

        res.json({ message: 'Member approved and created successfully', member, fellowshipNumber });
    } catch (error: any) {
        console.error('[PENDING] Approve error:', error);
        res.status(500).json({ error: 'Approval failed. Please try again.' });
    }
};

/**
 * POST /api/pending-members/:id/reject
 * Reject a pending member with an optional note
 */
export const rejectPendingMember = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { reviewNote } = req.body;
        const reviewerId = String((req as any).user?.id ?? '');

        const pending = await prisma.pendingMember.findUnique({ where: { id } });
        if (!pending) return res.status(404).json({ error: 'Pending registration not found' });
        if (pending.status !== 'PENDING') return res.status(400).json({ error: 'Already reviewed' });

        await prisma.$transaction(async (tx) => {
            await tx.pendingMember.update({
                where: { id },
                data: { status: 'REJECTED', reviewedBy: reviewerId, reviewNote, reviewedAt: new Date() },
            });

            // Queue rejection email
            await tx.emailQueue.create({
                data: {
                    email: pending.email,
                    subject: 'Update on Your Manifest Registration',
                    html: buildRejectionEmailHtml(pending.fullName, reviewNote),
                    text: `Hello ${pending.fullName}, unfortunately your registration could not be approved at this time.${reviewNote ? ` Reason: ${reviewNote}` : ''} Please contact the fellowship for assistance.`,
                },
            });
        }, { timeout: 15000 });

        res.json({ message: 'Registration rejected' });
    } catch (error) {
        console.error('[PENDING] Reject error:', error);
        res.status(500).json({ error: 'Failed to reject registration' });
    }
};

/**
 * GET /api/pending-members/stats
 * Summary counts for the FM dashboard badge
 */
export const getPendingStats = async (_req: Request, res: Response) => {
    try {
        const [pending, approvedToday, rejectedToday] = await Promise.all([
            prisma.pendingMember.count({ where: { status: 'PENDING' } }),
            prisma.pendingMember.count({
                where: { status: 'APPROVED', reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            }),
            prisma.pendingMember.count({
                where: { status: 'REJECTED', reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            }),
        ]);
        res.json({ pending, approvedToday, rejectedToday });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load stats' });
    }
};

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildConfirmationEmailHtml(fullName: string): string {
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <div style="background:#48A111;padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Manifest Fellowship</h1>
    <p style="color:rgba(255,255,255,.85);margin:4px 0 0">Registration Received</p>
  </div>
  <div style="padding:28px">
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Thank you for registering with Manifest Fellowship. We've received your details and our team will review them shortly.</p>
    <div style="background:#e9f5e1;border-left:4px solid #48A111;padding:16px;border-radius:6px;margin:20px 0">
      <p style="margin:0;color:#2d6a04"><strong>What happens next?</strong><br>
      Once reviewed and approved, you'll receive a welcome email with your fellowship number and login details.</p>
    </div>
    <p>If you have any questions, please contact the fellowship manager.</p>
    <p style="margin-top:24px">God bless,<br><strong>Manifest Fellowship Team</strong></p>
  </div>
</div></body></html>`;
}

function buildRejectionEmailHtml(fullName: string, reviewNote?: string): string {
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <div style="background:#48A111;padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Manifest Fellowship</h1>
    <p style="color:rgba(255,255,255,.85);margin:4px 0 0">Registration Update</p>
  </div>
  <div style="padding:28px">
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Thank you for your interest in Manifest Fellowship. After reviewing your registration, we were unable to complete your onboarding at this time.</p>
    ${reviewNote ? `<div style="background:#fef9ec;border-left:4px solid #F2B50B;padding:16px;border-radius:6px;margin:20px 0"><p style="margin:0;color:#92400e"><strong>Note from the team:</strong><br>${reviewNote}</p></div>` : ''}
    <p>Please reach out to the fellowship team directly if you believe this was an error or need further assistance.</p>
    <p style="margin-top:24px">God bless,<br><strong>Manifest Fellowship Team</strong></p>
  </div>
</div></body></html>`;
}
