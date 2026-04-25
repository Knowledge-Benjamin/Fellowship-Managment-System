import { Request, Response } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { getEventStatus } from '../utils/timezone';
import { PrismaClient } from "@prisma/client";

// ─── Validation schemas ───────────────────────────────────────────────────────

const createCampaignSchema = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    title: z.string().min(1, 'Title is required').max(150),
    description: z.string().max(500).optional(),
    submissionDeadline: z.string().datetime('Invalid deadline format'),
    maxContacts: z.number().int().min(1).default(20),
    manualTarget: z.number().int().min(1).nullable().optional(),
});

const updateCampaignSchema = z.object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
    submissionDeadline: z.string().datetime().optional(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).optional(),
    maxContacts: z.number().int().min(1).optional(),
    manualTarget: z.number().int().min(1).nullable().optional(),
});

const contactEntrySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    phone: z.string().min(7, 'Phone is required').max(20),
    email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
    relationship: z.string().max(50).optional(),
    callStatus: z.enum(['PENDING', 'CONFIRMED', 'NOT_CONFIRMED']).optional(),
    transportNeed: z.enum(['NEEDS_TRANSPORT', 'DOES_NOT_NEED_TRANSPORT', 'PENDING']).optional(),
    location: z.string().optional().nullable(),
});

const submitContactsSchema = z.object({
    contacts: z.array(contactEntrySchema).min(1),
});

const updateContactSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().min(7).max(20).optional(),
    email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
    relationship: z.string().max(50).optional(),
    callStatus: z.enum(['PENDING', 'CONFIRMED', 'NOT_CONFIRMED']).optional(),
    transportNeed: z.enum(['NEEDS_TRANSPORT', 'DOES_NOT_NEED_TRANSPORT', 'PENDING']).optional(),
    location: z.string().optional().nullable(),
    notes: z.string().max(500).optional(),
    calledById: z.string().uuid().optional(),
    isDuplicate: z.boolean().optional(),
});

// ─── Campaign CRUD ────────────────────────────────────────────────────────────

/**
 * POST /api/campaigns
 * FM creates a mobilization campaign for an event.
 */
export const createCampaign = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
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
                manualTarget: data.manualTarget,
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
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        const wantsAdminView = String(req.query.adminView) === 'true';
        const applyAdminView = isManager && wantsAdminView;

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const campaigns = await prisma.mobilizationCampaign.findMany({
            where: applyAdminView ? {} : { status: 'OPEN' },
            include: {
                event: { select: { id: true, name: true, date: true, startTime: true, endTime: true, type: true } },
                creator: { select: { id: true, fullName: true } },
                _count: {
                    select: {
                        contacts: applyAdminView ? true : { where: { submittedById: userId } }
                    }
                },
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

        const finalCampaigns = applyAdminView ? processedCampaigns : processedCampaigns.filter((c: any) => c.status === 'OPEN');

        res.json(finalCampaigns);
    } catch (e) {
        console.error('[CAMPAIGN] Error fetching campaigns:', e);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
};

/**
 * GET /api/campaigns/:id
 * Campaign detail: FM sees all contacts (if adminView); member sees only their own.
 */
export const getCampaignById = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const id = req.params.id as string;
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        const wantsAdminView = String(req.query.adminView) === 'true';
        const applyAdminView = isManager && wantsAdminView;

        const campaign = await prisma.mobilizationCampaign.findUnique({
            where: { id },
            include: {
                event: { select: { id: true, name: true, date: true, startTime: true, endTime: true, type: true } },
                creator: { select: { id: true, fullName: true } },
                contacts: {
                    where: applyAdminView ? {} : { submittedById: userId },
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

        // Attach duplicate matches for Admin View
        if (applyAdminView) {
            // Store objects instead of just strings
            const phoneMap = new Map<string, { id: string, name: string }[]>();
            const emailMap = new Map<string, { id: string, name: string }[]>();

            for (const contact of campaign.contacts) {
                if (!phoneMap.has(contact.phone)) phoneMap.set(contact.phone, []);
                phoneMap.get(contact.phone)!.push({ id: contact.id, name: contact.name });

                if (contact.email) {
                    if (!emailMap.has(contact.email)) emailMap.set(contact.email, []);
                    emailMap.get(contact.email)!.push({ id: contact.id, name: contact.name });
                }
            }

            campaign.contacts = campaign.contacts.map((contact: any) => {
                if (contact.isDuplicate) {
                    const samePhone = phoneMap.get(contact.phone)?.filter(c => c.id !== contact.id) || [];
                    const sameEmail = contact.email ? (emailMap.get(contact.email)?.filter(c => c.id !== contact.id) || []) : [];
                    
                    // Deduplicate the combined list
                    const matchMap = new Map<string, { id: string, name: string }>();
                    [...samePhone, ...sameEmail].forEach(c => matchMap.set(c.id, c));
                    
                    contact.duplicateMatches = Array.from(matchMap.values());
                }
                return contact;
            });
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
    const prisma = (req as any).prisma as PrismaClient;
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
    const prisma = (req as any).prisma as PrismaClient;
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
    const prisma = (req as any).prisma as PrismaClient;
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

        // Detect duplicates within campaign (same phone OR same email)
        const incomingPhones = incoming.map(c => c.phone);
        const incomingEmails = incoming.map(c => c.email).filter(Boolean) as string[];

        const existingByPhone = await prisma.mobilizationContact.findMany({
            where: { campaignId: id, phone: { in: incomingPhones } },
            select: { phone: true },
        });
        const duplicatePhones = new Set(existingByPhone.map(e => e.phone));

        const existingByEmail = incomingEmails.length > 0
            ? await prisma.mobilizationContact.findMany({
                where: { campaignId: id, email: { in: incomingEmails } },
                select: { email: true },
            })
            : [];
        const duplicateEmails = new Set(existingByEmail.map(e => e.email as string));

        const created = await prisma.mobilizationContact.createMany({
            data: incoming.map(c => ({
                campaignId: id,
                submittedById: userId,
                name: c.name,
                phone: c.phone,
                email: c.email || null,
                relationship: c.relationship || null,
                callStatus: (c.callStatus || 'PENDING') as any,
                transportNeed: (c.transportNeed || 'PENDING') as any,
                location: c.location || null,
                calledById: c.callStatus && c.callStatus !== 'PENDING' ? userId : undefined,
                calledAt: c.callStatus && c.callStatus !== 'PENDING' ? new Date() : undefined,
                isDuplicate: duplicatePhones.has(c.phone) || (!!c.email && duplicateEmails.has(c.email)),
            })),
        });

        // Flag existing entries that now have duplicate phone or email
        const idsToFlag: string[] = [];
        if (duplicatePhones.size > 0) {
            const existing = await prisma.mobilizationContact.findMany({
                where: { campaignId: id, phone: { in: Array.from(duplicatePhones) } },
                select: { id: true },
            });
            idsToFlag.push(...existing.map(e => e.id));
        }
        if (duplicateEmails.size > 0) {
            const existing = await prisma.mobilizationContact.findMany({
                where: { campaignId: id, email: { in: Array.from(duplicateEmails) } },
                select: { id: true },
            });
            idsToFlag.push(...existing.map(e => e.id));
        }
        if (idsToFlag.length > 0) {
            await prisma.mobilizationContact.updateMany({
                where: { id: { in: idsToFlag } },
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
 * Member (who submitted) OR FM can update call status and notes.
 * Members can only update their own contacts.
 */
export const updateContact = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const contactId = req.params.contactId as string;
        const userId = req.user?.id;
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const data = updateContactSchema.parse(req.body);

        const contact = await prisma.mobilizationContact.findUnique({ 
            where: { id: contactId },
            include: { campaign: { include: { event: true } } }
        });
        if (!contact) return res.status(404).json({ message: 'Contact not found' });

        if (getEventStatus(contact.campaign.event) === 'PAST') {
            return res.status(400).json({ message: 'Cannot edit contacts for past events' });
        }

        // Members can only update contacts they personally submitted
        if (!isManager && contact.submittedById !== userId) {
            return res.status(403).json({ message: 'You can only update your own contacts' });
        }

        const resolvedCalledById =
            data.calledById ||
            (data.callStatus && data.callStatus !== 'PENDING' ? userId : null);

        // Build payload imperatively to avoid Prisma scalar/relation union conflict
        const payload: Record<string, unknown> = {};
        if (data.name        !== undefined) payload.name        = data.name;
        if (data.phone       !== undefined) payload.phone       = data.phone;
        if (data.email       !== undefined) payload.email       = data.email;
        if (data.relationship!== undefined) payload.relationship= data.relationship;
        if (data.callStatus  !== undefined) payload.callStatus  = data.callStatus;
        if (data.transportNeed !== undefined) payload.transportNeed = data.transportNeed;
        if (data.location    !== undefined) payload.location    = data.location;
        if (data.notes       !== undefined) payload.notes       = data.notes;
        if (data.isDuplicate !== undefined) payload.isDuplicate = data.isDuplicate;
        if (data.callStatus && data.callStatus !== 'PENDING' && !contact.calledAt) {
            payload.calledAt = new Date();
        }
        if (resolvedCalledById) payload.calledById = resolvedCalledById;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = await (prisma.mobilizationContact.update as any)({
            where: { id: contactId },
            data: payload,
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
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const id = req.params.id as string;
        const { status } = req.query;

        const campaign = await prisma.mobilizationCampaign.findUnique({ where: { id } });
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        const userId = req.user?.id;

        const contacts = await prisma.mobilizationContact.findMany({
            where: {
                campaignId: id,
                ...(status ? { callStatus: status as any } : {}),
            },
            include: {
                submittedBy: { select: { id: true, fullName: true, fellowshipNumber: true, region: { select: { name: true } } } },
                calledBy: { select: { id: true, fullName: true } },
                _count: {
                    select: {
                        messages: {
                            where: { isRead: false, senderId: { not: userId } }
                        }
                    }
                }
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
    const prisma = (req as any).prisma as PrismaClient;
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
                submittedBy: { select: { fullName: true, fellowshipNumber: true, region: { select: { name: true } } } },
                calledBy: { select: { fullName: true } },
            },
            orderBy: [{ submittedById: 'asc' }, { name: 'asc' }],
        });

        const workbook = new ExcelJS.Workbook();
        
        // Group by Region
        const regionMap = new Map<string, any[]>();
        contacts.forEach(c => {
            const regionName = c.submittedBy?.region?.name || 'Unassigned';
            if (!regionMap.has(regionName)) {
                regionMap.set(regionName, []);
            }
            regionMap.get(regionName)!.push(c);
        });

        let sheetCounter = 1;
        const createSheet = (name: string, data: any[]) => {
            let sheetName = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().substring(0, 31);
            if (!sheetName) sheetName = `Group ${sheetCounter++}`;
            
            // Check for duplicates
            if (workbook.getWorksheet(sheetName)) {
                sheetName = `${sheetName.substring(0, 27)} ${sheetCounter++}`;
            }

            const sheet = workbook.addWorksheet(sheetName, {
                properties: { tabColor: { argb: 'FF6366f1' } },
            });

            const headerRow = sheet.addRow([
                'Submitted By', 'Fellowship #', 'Region', 'Contact Name', 'Phone', 'Email',
                'Relationship', 'Transport Need', 'Location', 'Call Status', 'Called By', 'Called At', 'Notes', 'Duplicate?',
            ]);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366f1' } };
            headerRow.height = 25;
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

            data.forEach((c, i) => {
                const row = sheet.addRow([
                    c.submittedBy?.fullName || 'Unknown',
                    c.submittedBy?.fellowshipNumber || '-',
                    c.submittedBy?.region?.name || 'Unassigned',
                    c.name,
                    c.phone,
                    c.email || '-',
                    c.relationship || '-',
                    c.transportNeed ? c.transportNeed.replace(/_/g, ' ') : 'PENDING',
                    c.location || '-',
                    c.callStatus.replace(/_/g, ' '),
                    c.calledBy?.fullName || '-',
                    c.calledAt ? c.calledAt.toISOString().split('T')[0] : '-',
                    c.notes || '-',
                    c.isDuplicate ? 'Yes' : 'No',
                ]);
                if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });

            sheet.columns = [
                { width: 28 }, { width: 15 }, { width: 20 }, { width: 28 }, { width: 18 },
                { width: 28 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 16 }, { width: 25 },
                { width: 14 }, { width: 30 }, { width: 12 },
            ];
        };

        // Create a sheet for each region
        Array.from(regionMap.keys()).sort().forEach(regionName => {
            createSheet(regionName, regionMap.get(regionName)!);
        });

        // Ensure at least one sheet exists if empty
        if (contacts.length === 0) {
            workbook.addWorksheet('No Contacts');
        }

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

/**
 * GET /api/campaigns/:id/report
 * Returns the unified Campaign Report Data for a Mobilization Campaign
 */
export const getMobilizationReport = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        if (!isManager) return res.status(403).json({ message: 'Forbidden' });

        const id = req.params.id as string;
        
        const campaign = await prisma.mobilizationCampaign.findUnique({
            where: { id },
        });

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Fetch contacts with nested submitter info
        const contacts = await prisma.mobilizationContact.findMany({
            where: { campaignId: id },
            include: {
                submittedBy: {
                    select: {
                        id: true,
                        fullName: true,
                        region: { select: { name: true } },
                        memberTags: { select: { tag: { select: { name: true } } } }
                    }
                }
            }
        });

        const totalActiveMembers = await prisma.member.count({
            where: { isDeleted: false }
        });

        // ── Aggregation Logic ── //
        let pending = 0;
        let confirmed = 0;
        let notConfirmed = 0;
        let duplicateCount = 0;

        const submittersMap = new Map<string, any>();
        const regionBreakdown: Record<string, number> = {};

        contacts.forEach(c => {
            if (c.callStatus === 'PENDING') pending++;
            else if (c.callStatus === 'CONFIRMED') confirmed++;
            else if (c.callStatus === 'NOT_CONFIRMED') notConfirmed++;

            if (c.isDuplicate) duplicateCount++;

            // Submitter Aggregation
            const submitterId = c.submittedBy.id;
            if (!submittersMap.has(submitterId)) {
                const isLeader = c.submittedBy.memberTags.some((mt: any) => 
                    ['REGIONAL_HEAD', 'FAMILY_HEAD', 'TEAM_LEADER'].includes(mt.tag.name)
                );
                
                const regionName = c.submittedBy.region?.name || 'Unassigned';
                
                // Track region breakdown by distinct submitters
                regionBreakdown[regionName] = (regionBreakdown[regionName] || 0) + 1;

                submittersMap.set(submitterId, {
                    memberId: submitterId,
                    name: c.submittedBy.fullName,
                    region: regionName,
                    isLeader,
                    contactsCount: 0
                });
            }
            submittersMap.get(submitterId).contactsCount++;
        });

        const totalContactsSubmitted = contacts.length;
        const membersSubmitted = submittersMap.size;
        
        let leadersSubmitted = 0;
        submittersMap.forEach(s => {
            if (s.isLeader) leadersSubmitted++;
        });

        const totalTarget = campaign.manualTarget !== null ? campaign.manualTarget : (totalActiveMembers * campaign.maxContacts);
        
        const averageContactsPerMember = membersSubmitted > 0 ? (totalContactsSubmitted / membersSubmitted) : 0;
        
        // Formulate returning standardized object
        const reportData = {
            campaign: {
                id: campaign.id,
                title: campaign.title,
                type: 'MOBILIZATION',
                status: campaign.status,
                targetContactsPerMember: campaign.maxContacts,
                deadline: campaign.submissionDeadline.toISOString()
            },
            stats: {
                totalTarget,
                membersSubmitted,
                contactsSubmitted: totalContactsSubmitted,
                leadersSubmitted,
                averageContactsPerMember: Number(averageContactsPerMember.toFixed(1)),
                statusBreakdown: { PENDING: pending, CONFIRMED: confirmed, NOT_CONFIRMED: notConfirmed },
                regionBreakdown,
                successPercentage: totalTarget > 0 ? (totalContactsSubmitted / totalTarget) * 100 : 0,
                duplicatePercentage: totalContactsSubmitted > 0 ? (duplicateCount / totalContactsSubmitted) * 100 : 0,
                confirmationPercentage: totalContactsSubmitted > 0 ? (confirmed / totalContactsSubmitted) * 100 : 0,
                pendingPercentage: totalContactsSubmitted > 0 ? (pending / totalContactsSubmitted) * 100 : 0,
                notConfirmedPercentage: totalContactsSubmitted > 0 ? (notConfirmed / totalContactsSubmitted) * 100 : 0,
            },
            drilldowns: {
                submitters: Array.from(submittersMap.values()).sort((a, b) => b.contactsCount - a.contactsCount),
                contacts: contacts.map(c => ({
                    id: c.id,
                    contactName: c.name,
                    phone: c.phone,
                    submittedBy: c.submittedBy.fullName,
                    region: c.submittedBy.region?.name || 'Unassigned',
                    status: c.callStatus,
                    isDuplicate: c.isDuplicate
                }))
            }
        };

        res.json(reportData);
    } catch (e) {
        console.error('[CAMPAIGN REPORT] Get Mobilization Report Error:', e);
        res.status(500).json({ message: 'Failed to generate mobilization report' });
    }
};

// ─── Campaign Micro-Chats (Mobilization Contacts) ──────────────────────────────────

/**
 * GET /api/campaigns/contacts/:id/messages
 * Fetches the entire conversation history for a specific Mobilization contact.
 */
export const getMobilizationMessages = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const userId = req.user?.id;
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const contactId = req.params.id as string;
        const contact = await prisma.mobilizationContact.findUnique({ where: { id: contactId } });
        if (!contact) return res.status(404).json({ message: 'Contact not found' });

        if (!isManager && contact.submittedById !== userId) {
            return res.status(403).json({ message: 'Not allowed to view this chat' });
        }

        const messages = await prisma.campaignMessage.findMany({
            where: { mobilizationId: contactId },
            include: { sender: { select: { id: true, fullName: true, role: true } } },
            orderBy: { createdAt: 'asc' },
        });

        res.json(messages);
    } catch (e) {
        console.error('[CAMPAIGN] getMessages error:', e);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

/**
 * POST /api/campaigns/contacts/:id/messages
 * Submits a new message to the contact's chat thread.
 */
export const sendMobilizationMessage = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const userId = req.user?.id;
        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const contactId = req.params.id as string;
        const { text } = req.body;
        
        if (!text || typeof text !== 'string') return res.status(400).json({ message: 'Text is required' });

        const contact = await prisma.mobilizationContact.findUnique({ where: { id: contactId } });
        if (!contact) return res.status(404).json({ message: 'Contact not found' });

        if (!isManager && contact.submittedById !== userId) {
            return res.status(403).json({ message: 'Not allowed to chat on this contact' });
        }

        const message = await prisma.campaignMessage.create({
            data: {
                mobilizationId: contactId,
                senderId: userId,
                text,
            },
            include: { sender: { select: { id: true, fullName: true, role: true } } },
        });

        res.status(201).json(message);
    } catch (e) {
        console.error('[CAMPAIGN] sendMessage error:', e);
        res.status(500).json({ message: 'Failed to send message' });
    }
};

/**
 * PATCH /api/campaigns/contacts/:id/messages/read
 * Marks all messages in the thread NOT sent by the current user as read.
 */
export const markMobilizationMessagesRead = async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const contactId = req.params.id as string;

        await prisma.campaignMessage.updateMany({
            where: {
                mobilizationId: contactId,
                senderId: { not: userId },
                isRead: false,
            },
            data: { isRead: true },
        });

        res.json({ message: 'Messages marked as read' });
    } catch (e) {
        console.error('[CAMPAIGN] markAsRead error:', e);
        res.status(500).json({ message: 'Failed to mark messages as read' });
    }
};
