import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import ExcelJS from 'exceljs';

// ─── Validation ───────────────────────────────────────────────────────────────

const createCampaignSchema = z.object({
    title: z.string().min(1, 'Title is required').max(150),
    description: z.string().max(500).optional(),
    minPledges: z.number().int().min(1).default(1),
});

const updateCampaignSchema = z.object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
    minPledges: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
});

const pledgeEntrySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email'),
    phone1: z.string().min(7).max(20).optional(),
    phone2: z.string().min(7).max(20).optional(),
});

const submitPledgesSchema = z.object({
    campaignId: z.string().uuid('Invalid campaign ID'),
    eventId: z.string().uuid('Invalid event ID'),
    pledges: z.array(pledgeEntrySchema).min(1, 'At least one pledge is required').max(200),
});

// ─── Campaign Management (FM only) ───────────────────────────────────────────

/**
 * POST /api/bring-one/campaigns
 * FM creates a new Bring 1 campaign config.
 * Only one should be active at a time — this does NOT auto-deactivate others.
 */
export const createBringOneCampaign = async (req: Request, res: Response) => {
    try {
        const createdBy = req.user?.id;
        if (!createdBy) return res.status(401).json({ message: 'Unauthorized' });

        const data = createCampaignSchema.parse(req.body);

        const campaign = await prisma.bringOneCampaign.create({
            data: { ...data, createdBy },
        });

        res.status(201).json({ message: 'Campaign created', campaign });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[BRING-ONE] Create campaign error:', e);
        res.status(500).json({ message: 'Failed to create campaign' });
    }
};

/**
 * GET /api/bring-one/campaigns
 * All: members see active campaign, FM sees all.
 */
export const getBringOneCampaigns = async (req: Request, res: Response) => {
    try {
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';

        const campaigns = await prisma.bringOneCampaign.findMany({
            where: isManager ? {} : { isActive: true },
            include: {
                creator: { select: { id: true, fullName: true } },
                _count: { select: { pledges: true } },
            },
            orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        });

        res.json(campaigns);
    } catch (e) {
        console.error('[BRING-ONE] Get campaigns error:', e);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
};

/**
 * PATCH /api/bring-one/campaigns/:id
 * FM updates a campaign (title, minPledges, isActive).
 * When setting isActive=true, deactivates all others first.
 */
export const updateBringOneCampaign = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const data = updateCampaignSchema.parse(req.body);

        const campaign = await prisma.bringOneCampaign.findUnique({ where: { id } });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        if (data.isActive === true) {
            // Ensure only one active campaign at a time
            await prisma.bringOneCampaign.updateMany({
                where: { id: { not: id }, isActive: true },
                data: { isActive: false },
            });
        }

        const updated = await prisma.bringOneCampaign.update({ where: { id }, data });
        res.json({ message: 'Campaign updated', campaign: updated });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[BRING-ONE] Update campaign error:', e);
        res.status(500).json({ message: 'Failed to update campaign' });
    }
};

// ─── Pledge Management ────────────────────────────────────────────────────────

/**
 * POST /api/bring-one/pledges
 * Member submits their pledge list for a specific event.
 */
export const submitPledges = async (req: Request, res: Response) => {
    try {
        const inviterId = req.user?.id;
        if (!inviterId) return res.status(401).json({ message: 'Unauthorized' });

        const { campaignId, eventId, pledges } = submitPledgesSchema.parse(req.body);

        const [campaign, event] = await Promise.all([
            prisma.bringOneCampaign.findUnique({ where: { id: campaignId } }),
            prisma.event.findUnique({ where: { id: eventId } }),
        ]);

        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        if (!campaign.isActive) return res.status(400).json({ message: 'This campaign is not currently active' });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Prevent duplicate pledges for same email by this member for this event
        const emails = pledges.map(p => p.email.toLowerCase());
        const existing = await prisma.bringOnePledge.findMany({
            where: { eventId, inviterId, email: { in: emails } },
            select: { email: true },
        });
        if (existing.length > 0) {
            const dupes = existing.map(e => e.email).join(', ');
            return res.status(400).json({
                message: `You already have pledges for these emails in this event: ${dupes}`,
            });
        }

        const created = await prisma.bringOnePledge.createMany({
            data: pledges.map(p => ({
                campaignId,
                eventId,
                inviterId,
                name: p.name,
                email: p.email.toLowerCase(),
                phone1: p.phone1 || null,
                phone2: p.phone2 || null,
            })),
        });

        res.status(201).json({
            message: `${created.count} pledge(s) submitted`,
            count: created.count,
        });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[BRING-ONE] Submit pledges error:', e);
        res.status(500).json({ message: 'Failed to submit pledges' });
    }
};

/**
 * GET /api/bring-one/my-pledges?eventId=
 * Member views their own pledges (optionally filtered by event).
 */
export const getMyPledges = async (req: Request, res: Response) => {
    try {
        const inviterId = req.user?.id;
        if (!inviterId) return res.status(401).json({ message: 'Unauthorized' });

        const { eventId } = req.query;
        const where: any = { inviterId };
        if (eventId && typeof eventId === 'string') where.eventId = eventId;

        const pledges = await prisma.bringOnePledge.findMany({
            where,
            include: {
                event: { select: { id: true, name: true, date: true } },
                campaign: { select: { id: true, title: true, minPledges: true } },
            },
            orderBy: [{ eventId: 'asc' }, { createdAt: 'desc' }],
        });

        res.json(pledges);
    } catch (e) {
        console.error('[BRING-ONE] Get my pledges error:', e);
        res.status(500).json({ message: 'Failed to fetch pledges' });
    }
};

/**
 * DELETE /api/bring-one/pledges/:id
 * Member deletes a pledge that hasn't been matched yet.
 */
export const deletePledge = async (req: Request, res: Response) => {
    try {
        const inviterId = req.user?.id;
        if (!inviterId) return res.status(401).json({ message: 'Unauthorized' });

        const id = req.params.id as string;
        const pledge = await prisma.bringOnePledge.findUnique({ where: { id } });

        if (!pledge) return res.status(404).json({ message: 'Pledge not found' });
        if (pledge.inviterId !== inviterId) return res.status(403).json({ message: 'Not your pledge' });
        if (pledge.status !== 'PLEDGED') {
            return res.status(400).json({ message: 'Cannot delete a pledge that has already been matched' });
        }

        await prisma.bringOnePledge.delete({ where: { id } });
        res.json({ message: 'Pledge deleted' });
    } catch (e) {
        console.error('[BRING-ONE] Delete pledge error:', e);
        res.status(500).json({ message: 'Failed to delete pledge' });
    }
};

/**
 * GET /api/bring-one/event/:eventId
 * FM: full pledge list + effectiveness stats for a specific event.
 */
export const getEventPledges = async (req: Request, res: Response) => {
    try {
        const eventId = req.params.eventId as string;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, name: true, date: true },
        });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const pledges = await prisma.bringOnePledge.findMany({
            where: { eventId },
            include: {
                inviter: { select: { id: true, fullName: true, fellowshipNumber: true, region: { select: { name: true } } } },
                campaign: { select: { id: true, title: true, minPledges: true } },
            },
            orderBy: [{ status: 'asc' }, { inviterId: 'asc' }, { createdAt: 'asc' }],
        });

        const totalPledges = pledges.length;
        const uniqueInviters = new Set(pledges.map(p => p.inviterId)).size;
        const byStatus = pledges.reduce((acc: Record<string, number>, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {});

        // Per-inviter summary
        const inviterSummary = Object.values(
            pledges.reduce((acc: Record<string, any>, p) => {
                if (!acc[p.inviterId]) {
                    acc[p.inviterId] = {
                        inviter: p.inviter,
                        total: 0,
                        attended: 0,
                    };
                }
                acc[p.inviterId].total++;
                if (p.status === 'ATTENDED') acc[p.inviterId].attended++;
                return acc;
            }, {})
        );

        res.json({
            event,
            pledges,
            inviterSummary,
            stats: {
                totalPledges,
                uniqueInviters,
                byStatus,
                conversionRate: totalPledges > 0
                    ? (((byStatus['ATTENDED'] || 0) / totalPledges) * 100).toFixed(1) + '%'
                    : '0%',
            },
        });
    } catch (e) {
        console.error('[BRING-ONE] Get event pledges error:', e);
        res.status(500).json({ message: 'Failed to fetch event pledges' });
    }
};

/**
 * GET /api/bring-one/event/:eventId/export
 * FM exports all pledges for an event as Excel.
 */
export const exportEventPledges = async (req: Request, res: Response) => {
    try {
        const eventId = req.params.eventId as string;

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const pledges = await prisma.bringOnePledge.findMany({
            where: { eventId },
            include: {
                inviter: { select: { fullName: true, fellowshipNumber: true } },
                campaign: { select: { title: true } },
            },
            orderBy: [{ status: 'asc' }, { inviterId: 'asc' }],
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Bring 1 Pledges', {
            properties: { tabColor: { argb: 'FF14b8a6' } },
        });

        const headerRow = sheet.addRow([
            'Campaign', 'Inviter', 'Fellowship #', 'Pledged Name', 'Email',
            'Phone 1', 'Phone 2', 'Status', 'Matched By', 'Duplicate?', 'Submitted At',
        ]);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14b8a6' } };
        headerRow.height = 25;
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

        pledges.forEach((p, i) => {
            const row = sheet.addRow([
                p.campaign.title,
                p.inviter.fullName,
                p.inviter.fellowshipNumber,
                p.name,
                p.email,
                p.phone1 || '-',
                p.phone2 || '-',
                p.status,
                p.matchedBy || '-',
                p.isDuplicate ? 'Yes' : 'No',
                new Date(p.createdAt).toISOString().split('T')[0],
            ]);
            if (i % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
        });

        sheet.columns = [
            { width: 20 }, { width: 28 }, { width: 15 }, { width: 28 }, { width: 30 },
            { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 14 },
        ];

        const eventDate = new Date(event.date).toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="bring1_${eventDate}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('[BRING-ONE] Export error:', e);
        res.status(500).json({ message: 'Failed to export pledges' });
    }
};

// ─── Matching helpers (called by selfRegController + attendanceController) ────

/**
 * Matches a newly registered person against all PLEDGED entries.
 * Email is primary; phone1/phone2 are fallbacks.
 * Called immediately after PendingMember creation.
 */
export async function matchAndAdvancePledge(params: {
    email: string;
    phone: string;
    pendingMemberId: string;
}) {
    const { email, phone, pendingMemberId } = params;

    // Step 1: email (primary — definitive)
    let pledge = await prisma.bringOnePledge.findFirst({
        where: { email: email.toLowerCase(), status: 'PLEDGED' },
    });
    let matchedBy: string | null = pledge ? 'email' : null;

    // Step 2: phone1 fallback
    if (!pledge && phone) {
        pledge = await prisma.bringOnePledge.findFirst({
            where: { phone1: phone, status: 'PLEDGED' },
        });
        if (pledge) matchedBy = 'phone1';
    }

    // Step 3: phone2 fallback
    if (!pledge && phone) {
        pledge = await prisma.bringOnePledge.findFirst({
            where: { phone2: phone, status: 'PLEDGED' },
        });
        if (pledge) matchedBy = 'phone2';
    }

    if (!pledge || !matchedBy) return null;

    // Check for duplicates (multiple members pledged same contact)
    const dupCount = await prisma.bringOnePledge.count({
        where: { email: email.toLowerCase(), status: 'PLEDGED' },
    });

    await prisma.bringOnePledge.update({
        where: { id: pledge.id },
        data: {
            status: 'PENDING_APPROVAL',
            pendingMemberId,
            matchedBy,
            resolvedAt: new Date(),
            isDuplicate: dupCount > 1,
        },
    });

    if (dupCount > 1) {
        await prisma.bringOnePledge.updateMany({
            where: { id: { not: pledge.id }, email: email.toLowerCase(), status: 'PLEDGED' },
            data: { isDuplicate: true },
        });
    }

    return pledge;
}

/** Called when FM approves a PendingMember and a full Member is created. */
export async function advancePledgeToJoined(pendingMemberId: string, memberId: string) {
    await prisma.bringOnePledge.updateMany({
        where: { pendingMemberId, status: 'PENDING_APPROVAL' },
        data: { status: 'JOINED', memberId },
    });
}

/** Called from attendanceController when isFirstTimer check-in occurs. */
export async function advancePledgeToAttended(memberId: string) {
    await prisma.bringOnePledge.updateMany({
        where: { memberId, status: 'JOINED' },
        data: { status: 'ATTENDED' },
    });
}

/** 
 * Matches a DIRECTLY created member (e.g. via FM internal registration)
 * Skips the PENDING_APPROVAL state and goes straight to JOINED.
 */
export async function matchAndAdvanceDirectMemberPledge(params: {
    email: string;
    phone: string;
    memberId: string;
}) {
    const { email, phone, memberId } = params;

    let pledge = await prisma.bringOnePledge.findFirst({
        where: { email: email.toLowerCase(), status: 'PLEDGED' },
    });
    let matchedBy: string | null = pledge ? 'email' : null;

    if (!pledge && phone) {
        pledge = await prisma.bringOnePledge.findFirst({
            where: { phone1: phone, status: 'PLEDGED' },
        });
        if (pledge) matchedBy = 'phone1';
    }

    if (!pledge && phone) {
        pledge = await prisma.bringOnePledge.findFirst({
            where: { phone2: phone, status: 'PLEDGED' },
        });
        if (pledge) matchedBy = 'phone2';
    }

    if (!pledge || !matchedBy) return null;

    const dupCount = await prisma.bringOnePledge.count({
        where: { email: email.toLowerCase(), status: 'PLEDGED' },
    });

    await prisma.bringOnePledge.update({
        where: { id: pledge.id },
        data: {
            status: 'JOINED',
            memberId,
            matchedBy,
            resolvedAt: new Date(),
            isDuplicate: dupCount > 1,
        },
    });

    if (dupCount > 1) {
        await prisma.bringOnePledge.updateMany({
            where: { id: { not: pledge.id }, email: email.toLowerCase(), status: 'PLEDGED' },
            data: { isDuplicate: true },
        });
    }

    return pledge;
}
