import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import ExcelJS from 'exceljs';
import { getEventStatus } from '../utils/timezone';

// ─── Validation schemas ───────────────────────────────────────────────────────

const createCampaignSchema = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    title: z.string().min(1, 'Title is required').max(150),
    description: z.string().max(500).optional(),
    submissionDeadline: z.string().datetime('Invalid deadline format'),
    maxContacts: z.number().int().min(1).default(20),
});

const updateCampaignSchema = z.object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
    submissionDeadline: z.string().datetime().optional(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).optional(),
    maxContacts: z.number().int().min(1).optional(),
});

const contactEntrySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    phone: z.string().min(7, 'Phone is required').max(20),
    email: z.string().email().optional(),
    relationship: z.string().max(50).optional(),
});

const submitContactsSchema = z.object({
    contacts: z.array(contactEntrySchema).min(1),
});

const updateContactSchema = z.object({
    callStatus: z.enum(['NOT_CALLED', 'CALLED', 'CONFIRMED', 'ATTENDED', 'UNREACHABLE']).optional(),
    notes: z.string().max(500).optional(),
    calledById: z.string().uuid().optional(),
});

// ─── Campaign CRUD ────────────────────────────────────────────────────────────

/**
 * POST /api/campaigns
 * FM creates a mobilization campaign for an event.
 */
export const createCampaign = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const data = createCampaignSchema.parse(req.body);

        const event = await prisma.event.findUnique({ where: { id: data.eventId } });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const campaign = await prisma.mobilizationCampaign.create({
            data: {
                eventId: data.eventId,
                title: data.title,
                description: data.description,
                submissionDeadline: new Date(data.submissionDeadline),
                maxContacts: data.maxContacts,
                createdBy: userId,
                status: 'OPEN', // Force new campaigns to start open
            },
        });

        res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[CAMPAIGN] Error creating campaign:', e);
        res.status(500).json({ message: 'Failed to create campaign' });
    }
};

/**
 * GET /api/campaigns
 * Members see OPEN campaigns; FM sees all.
 */
export const getCampaigns = async (req: Request, res: Response) => {
    try {
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';

        const campaigns = await prisma.mobilizationCampaign.findMany({
            where: isManager ? {} : { status: 'OPEN' },
            include: {
                event: { select: { id: true, name: true, date: true, startTime: true, endTime: true, type: true } },
                creator: { select: { id: true, fullName: true } },
                _count: { select: { contacts: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const processedCampaigns = campaigns.map((c: any) => {
            if (c.status === 'OPEN' && getEventStatus(c.event) === 'PAST') {
                prisma.mobilizationCampaign.update({ where: { id: c.id }, data: { status: 'CLOSED' } }).catch(e => console.error('[CAMPAIGN] auto-close err', e));
                return { ...c, status: 'CLOSED' };
            }
            return c;
        });

        const finalCampaigns = isManager ? processedCampaigns : processedCampaigns.filter((c: any) => c.status === 'OPEN');

        res.json(finalCampaigns);
    } catch (e) {
        console.error('[CAMPAIGN] Error fetching campaigns:', e);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
};

/**
 * GET /api/campaigns/:id
 * Campaign detail: FM sees all contacts; member sees only their own.
 */
export const getCampaignById = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const id = req.params.id as string;
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';

        const campaign = await prisma.mobilizationCampaign.findUnique({
            where: { id },
            include: {
                event: { select: { id: true, name: true, date: true, startTime: true, endTime: true, type: true } },
                creator: { select: { id: true, fullName: true } },
                contacts: {
                    where: isManager ? {} : { submittedById: userId },
                    include: {
                        submittedBy: { select: { id: true, fullName: true, fellowshipNumber: true } },
                        calledBy: { select: { id: true, fullName: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        
        if (campaign.status === 'OPEN' && getEventStatus(campaign.event as any) === 'PAST') {
            campaign.status = 'CLOSED';
            prisma.mobilizationCampaign.update({ where: { id }, data: { status: 'CLOSED' } }).catch(e => console.error('[CAMPAIGN] auto-close err', e));
        }

        if (!isManager && campaign.status === 'DRAFT') {
            return res.status(403).json({ message: 'Campaign is not yet available' });
        }

        // Submission count for the current member (for progress bar)
        const myCount = isManager ? undefined : campaign.contacts.length;

        res.json({ ...campaign, myCount });
    } catch (e) {
        console.error('[CAMPAIGN] Error fetching campaign:', e);
        res.status(500).json({ message: 'Failed to fetch campaign' });
    }
};

/**
 * PATCH /api/campaigns/:id
 * FM updates campaign status, deadline, or title.
 */
export const updateCampaign = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const data = updateCampaignSchema.parse(req.body);

        const campaign = await prisma.mobilizationCampaign.findUnique({ where: { id } });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        const updated = await prisma.mobilizationCampaign.update({
            where: { id },
            data: {
                ...data,
                submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : undefined,
            },
        });

        res.json({ message: 'Campaign updated', campaign: updated });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[CAMPAIGN] Error updating campaign:', e);
        res.status(500).json({ message: 'Failed to update campaign' });
    }
};

/**
 * DELETE /api/campaigns/:id
 * FM deletes a campaign and all its contacts.
 */
export const deleteCampaign = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const campaign = await prisma.mobilizationCampaign.findUnique({ where: { id } });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        await prisma.mobilizationCampaign.delete({ where: { id } });

        res.json({ message: 'Campaign deleted successfully' });
    } catch (e) {
        console.error('[CAMPAIGN] Error deleting campaign:', e);
        res.status(500).json({ message: 'Failed to delete campaign' });
    }
};

// ─── Contact Management ───────────────────────────────────────────────────────

/**
 * POST /api/campaigns/:id/contacts
 * Member submits their contact list (up to maxContacts).
 */
export const submitContacts = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const id = req.params.id as string;
        const { contacts: incoming } = submitContactsSchema.parse(req.body);

        const campaign = await prisma.mobilizationCampaign.findUnique({ 
            where: { id },
            include: { event: true } 
        });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        if (campaign.status !== 'OPEN') {
            return res.status(400).json({ message: 'This campaign is not currently accepting submissions' });
        }
        if (new Date() > new Date(campaign.submissionDeadline)) {
            return res.status(400).json({ message: 'Submission deadline has passed' });
        }
        
        const eventStatus = getEventStatus(campaign.event);
        if (eventStatus === 'PAST') {
            return res.status(400).json({ message: 'This event has already occurred' });
        }

        // Count existing submissions from this member
        const existingCount = await prisma.mobilizationContact.count({
            where: { campaignId: id, submittedById: userId },
        });

        const totalAfter = existingCount + incoming.length;
        if (totalAfter > campaign.maxContacts) {
            return res.status(400).json({
                message: `You can submit at most ${campaign.maxContacts} contacts. You already have ${existingCount}; adding ${incoming.length} would exceed the limit.`,
                remaining: campaign.maxContacts - existingCount,
            });
        }

        // Detect duplicates within campaign (same phone)
        const incomingPhones = incoming.map(c => c.phone);
        const existingPhones = await prisma.mobilizationContact.findMany({
            where: { campaignId: id, phone: { in: incomingPhones } },
            select: { phone: true },
        });
        const duplicatePhones = new Set(existingPhones.map(e => e.phone));

        const created = await prisma.mobilizationContact.createMany({
            data: incoming.map(c => ({
                campaignId: id,
                submittedById: userId,
                name: c.name,
                phone: c.phone,
                email: c.email || null,
                relationship: c.relationship || null,
                isDuplicate: duplicatePhones.has(c.phone),
            })),
        });

        // Flag existing entries with the same phones as duplicates too
        if (duplicatePhones.size > 0) {
            await prisma.mobilizationContact.updateMany({
                where: { campaignId: id, phone: { in: Array.from(duplicatePhones) } },
                data: { isDuplicate: true },
            });
        }

        res.status(201).json({
            message: `${created.count} contact(s) submitted`,
            count: created.count,
            totalSubmitted: existingCount + created.count,
            remaining: campaign.maxContacts - (existingCount + created.count),
        });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[CAMPAIGN] Error submitting contacts:', e);
        res.status(500).json({ message: 'Failed to submit contacts' });
    }
};

/**
 * PATCH /api/campaigns/:id/contacts/:contactId
 * FM updates call status, notes, or assigns caller.
 */
export const updateContact = async (req: Request, res: Response) => {
    try {
        const contactId = req.params.contactId as string;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const data = updateContactSchema.parse(req.body);

        const contact = await prisma.mobilizationContact.findUnique({ where: { id: contactId } });
        if (!contact) return res.status(404).json({ message: 'Contact not found' });

        const updated = await prisma.mobilizationContact.update({
            where: { id: contactId },
            data: {
                ...data,
                calledAt: data.callStatus && data.callStatus !== 'NOT_CALLED' && !contact.calledAt
                    ? new Date()
                    : undefined,
                calledById: data.calledById || (data.callStatus && data.callStatus !== 'NOT_CALLED' ? userId : undefined),
            },
        });

        res.json({ message: 'Contact updated', contact: updated });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[CAMPAIGN] Error updating contact:', e);
        res.status(500).json({ message: 'Failed to update contact' });
    }
};

/**
 * GET /api/campaigns/:id/contacts
 * FM: all contacts for a campaign with stats.
 */
export const getCampaignContacts = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status } = req.query;

        const campaign = await prisma.mobilizationCampaign.findUnique({ where: { id } });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        const contacts = await prisma.mobilizationContact.findMany({
            where: {
                campaignId: id,
                ...(status ? { callStatus: status as any } : {}),
            },
            include: {
                submittedBy: { select: { id: true, fullName: true, fellowshipNumber: true, region: { select: { name: true } } } },
                calledBy: { select: { id: true, fullName: true } },
            },
            orderBy: [{ callStatus: 'asc' }, { createdAt: 'asc' }],
        });

        const byStatus = contacts.reduce((acc: Record<string, number>, c) => {
            acc[c.callStatus] = (acc[c.callStatus] || 0) + 1;
            return acc;
        }, {});

        const memberSubmissions = contacts.reduce((acc: Record<string, number>, c) => {
            acc[c.submittedById] = (acc[c.submittedById] || 0) + 1;
            return acc;
        }, {});

        res.json({ campaign, contacts, stats: { total: contacts.length, byStatus, uniqueSubmitters: Object.keys(memberSubmissions).length } });
    } catch (e) {
        console.error('[CAMPAIGN] Error fetching contacts:', e);
        res.status(500).json({ message: 'Failed to fetch contacts' });
    }
};

/**
 * GET /api/campaigns/:id/export
 * FM exports all contacts as Excel.
 */
export const exportCampaign = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const campaign = await prisma.mobilizationCampaign.findUnique({
            where: { id },
            include: { event: { select: { name: true, date: true } } },
        });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        const contacts = await prisma.mobilizationContact.findMany({
            where: { campaignId: id },
            include: {
                submittedBy: { select: { fullName: true, fellowshipNumber: true } },
                calledBy: { select: { fullName: true } },
            },
            orderBy: [{ submittedById: 'asc' }, { name: 'asc' }],
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Mobilization Contacts', {
            properties: { tabColor: { argb: 'FF6366f1' } },
        });

        const headerRow = sheet.addRow([
            'Submitted By', 'Fellowship #', 'Contact Name', 'Phone', 'Email',
            'Relationship', 'Call Status', 'Called By', 'Called At', 'Notes', 'Duplicate?',
        ]);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366f1' } };
        headerRow.height = 25;
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

        contacts.forEach((c, i) => {
            const row = sheet.addRow([
                c.submittedBy.fullName,
                c.submittedBy.fellowshipNumber,
                c.name,
                c.phone,
                c.email || '-',
                c.relationship || '-',
                c.callStatus.replace(/_/g, ' '),
                c.calledBy?.fullName || '-',
                c.calledAt ? c.calledAt.toISOString().split('T')[0] : '-',
                c.notes || '-',
                c.isDuplicate ? 'Yes' : 'No',
            ]);
            if (i % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }
        });

        sheet.columns = [
            { width: 28 }, { width: 15 }, { width: 28 }, { width: 18 },
            { width: 28 }, { width: 18 }, { width: 16 }, { width: 25 },
            { width: 14 }, { width: 30 }, { width: 12 },
        ];

        const safeTitle = campaign.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="campaign_${safeTitle}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('[CAMPAIGN] Export error:', e);
        res.status(500).json({ message: 'Failed to export campaign' });
    }
};
