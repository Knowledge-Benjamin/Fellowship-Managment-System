import { Request, Response } from 'express';
import prisma from '../prisma';
import { EmailStatus } from '@prisma/client';

// ─── In-memory settings (initialized from env, runtime-editable) ───────────────
interface EmailSettings {
    fromName: string;
    replyTo: string;
    frontendUrl: string;
}

let emailSettings: EmailSettings = {
    fromName: process.env.EMAIL_FROM_NAME || 'Manifest Fellowship',
    replyTo: process.env.EMAIL_REPLY_TO || process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER || '',
    frontendUrl: process.env.FRONTEND_URL || '',
};

export const getEmailSettings = (_req: Request, res: Response) => {
    res.json({
        ...emailSettings,
        sendgridConfigured: !!process.env.SENDGRID_API_KEY,
        sendgridFrom: process.env.SENDGRID_FROM_EMAIL || null,
        gmailUser: process.env.GMAIL_USER || null,
    });
};

export const updateEmailSettings = (req: Request, res: Response) => {
    const { fromName, replyTo, frontendUrl } = req.body;
    if (fromName !== undefined) emailSettings.fromName = String(fromName).trim();
    if (replyTo !== undefined) emailSettings.replyTo = String(replyTo).trim();
    if (frontendUrl !== undefined) emailSettings.frontendUrl = String(frontendUrl).trim().replace(/\/$/, '');
    res.json({ message: 'Settings updated', ...emailSettings });
};

// Export so emailService can read the live settings
export const getSettings = () => emailSettings;

// ─── Queue / Stats ─────────────────────────────────────────────────────────────

export const getEmailQueue = async (req: Request, res: Response) => {
    try {
        const { status, search, page = '1', limit = '20' } = req.query;
        const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
        const parsedLimit = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));
        const skip = (parsedPage - 1) * parsedLimit;

        const where: any = {};
        if (status && status !== 'ALL') where.status = String(status) as EmailStatus;
        if (search) {
            where.OR = [
                { email: { contains: String(search), mode: 'insensitive' } },
                { subject: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        const [total, emails] = await Promise.all([
            prisma.emailQueue.count({ where }),
            prisma.emailQueue.findMany({
                where,
                skip,
                take: parsedLimit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    subject: true,
                    status: true,
                    attempts: true,
                    lastAttempt: true,
                    error: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
        ]);

        res.json({
            data: emails,
            meta: { total, page: parsedPage, limit: parsedLimit, totalPages: Math.ceil(total / parsedLimit) },
        });
    } catch (error) {
        console.error('[EMAIL CTRL] Queue list error:', error);
        res.status(500).json({ error: 'Failed to fetch email queue' });
    }
};

export const getEmailStats = async (_req: Request, res: Response) => {
    try {
        const [pending, processing, completed, failed] = await Promise.all([
            prisma.emailQueue.count({ where: { status: EmailStatus.PENDING } }),
            prisma.emailQueue.count({ where: { status: EmailStatus.PROCESSING } }),
            prisma.emailQueue.count({ where: { status: EmailStatus.COMPLETED } }),
            prisma.emailQueue.count({ where: { status: EmailStatus.FAILED } }),
        ]);
        res.json({ pending, processing, completed, failed, total: pending + processing + completed + failed });
    } catch (error) {
        console.error('[EMAIL CTRL] Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch email stats' });
    }
};

export const previewEmail = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const email = await prisma.emailQueue.findUnique({
            where: { id },
            select: { id: true, email: true, subject: true, html: true, text: true, status: true, createdAt: true },
        });
        if (!email) return res.status(404).json({ error: 'Email not found' });
        res.json(email);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch email' });
    }
};

export const retryEmail = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const email = await prisma.emailQueue.findUnique({ where: { id } });
        if (!email) return res.status(404).json({ error: 'Email not found' });
        if (email.status !== EmailStatus.FAILED) {
            return res.status(400).json({ error: 'Only failed emails can be retried' });
        }

        await prisma.emailQueue.update({
            where: { id },
            data: { status: EmailStatus.PENDING, attempts: 0, error: null },
        });

        res.json({ message: 'Email queued for retry' });
    } catch (error) {
        console.error('[EMAIL CTRL] Retry error:', error);
        res.status(500).json({ error: 'Failed to retry email' });
    }
};

export const deleteEmail = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const email = await prisma.emailQueue.findUnique({ where: { id } });
        if (!email) return res.status(404).json({ error: 'Email not found' });
        if (email.status === EmailStatus.PENDING || email.status === EmailStatus.PROCESSING) {
            return res.status(400).json({ error: 'Cannot delete a pending or processing email' });
        }
        await prisma.emailQueue.delete({ where: { id } });
        res.json({ message: 'Email removed from queue' });
    } catch (error) {
        console.error('[EMAIL CTRL] Delete error:', error);
        res.status(500).json({ error: 'Failed to delete email' });
    }
};

// ─── Compose ───────────────────────────────────────────────────────────────────

export const composeEmail = async (req: Request, res: Response) => {
    try {
        const {
            subject,
            html,
            text,
            regionId,
            tagId,
            targetEmail,
            sendToAll,
            ctaLabel,
            ctaUrl,
        } = req.body;

        if (!subject || !html) {
            return res.status(400).json({ error: 'Subject and HTML body are required' });
        }

        // Inject CTA button into HTML if provided
        let finalHtml = String(html);
        if (ctaLabel && ctaUrl) {
            const btn = `
<div style="text-align:center;margin:28px 0;">
  <a href="${String(ctaUrl)}" target="_blank"
     style="display:inline-block;background:#48A111;color:#fff;font-family:Arial,sans-serif;
            font-size:15px;font-weight:700;padding:13px 32px;border-radius:8px;
            text-decoration:none;letter-spacing:.3px;">
    ${String(ctaLabel)}
  </a>
</div>`;
            finalHtml = finalHtml.includes('</body>')
                ? finalHtml.replace('</body>', `${btn}</body>`)
                : finalHtml + btn;
        }

        // Resolve recipient list — explicit string casts to satisfy Prisma typings
        let emails: string[] = [];
        const safeEmail: string = String(targetEmail || '');
        const safeRegionId: string = String(regionId || '');
        const safeTagId: string = String(tagId || '');

        if (safeEmail) {
            const m = await prisma.member.findFirst({ where: { email: safeEmail, isDeleted: false } });
            if (!m) return res.status(404).json({ error: 'No active member found with that email' });
            emails = [safeEmail];
        } else if (safeRegionId) {
            const members = await prisma.member.findMany({
                where: { regionId: safeRegionId, isDeleted: false },
                select: { email: true },
            });
            emails = members.map(m => m.email);
        } else if (safeTagId) {
            const memberTags = await prisma.memberTag.findMany({
                where: { tagId: safeTagId, isActive: true, member: { isDeleted: false } },
                select: { member: { select: { email: true } } },
            });
            emails = memberTags.map(mt => mt.member.email);
        } else if (sendToAll) {
            const members = await prisma.member.findMany({
                where: { isDeleted: false },
                select: { email: true },
            });
            emails = members.map(m => m.email);
        } else {
            return res.status(400).json({ error: 'Specify a recipient: targetEmail, regionId, tagId, or sendToAll' });
        }

        if (emails.length === 0) {
            return res.status(400).json({ error: 'No recipients found for the selected target' });
        }

        await prisma.emailQueue.createMany({
            data: emails.map(email => ({
                email,
                subject: String(subject),
                html: finalHtml,
                text: String(text || subject),
                status: EmailStatus.PENDING,
            })),
        });

        res.status(201).json({
            message: `${emails.length} email(s) queued successfully`,
            count: emails.length,
        });
    } catch (error) {
        console.error('[EMAIL CTRL] Compose error:', error);
        res.status(500).json({ error: 'Failed to queue email(s)' });
    }
};

// ─── Recipients helper ────────────────────────────────────────────────────────

export const getRecipientOptions = async (_req: Request, res: Response) => {
    try {
        const [regions, tags] = await Promise.all([
            prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            prisma.tag.findMany({ select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } }),
        ]);
        res.json({ regions, tags });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recipient options' });
    }
};
