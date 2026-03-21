import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

const createSchema = z.object({
    toRegionId: z.string().uuid(),
    reason: z.string().min(5).max(500).optional(),
});

export const requestTransfer = async (req: Request, res: Response) => {
    try {
        const memberId = req.user?.id;
        if (!memberId) return res.status(401).json({ message: 'Unauthorized' });

        const data = createSchema.parse(req.body);

        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return res.status(404).json({ message: 'Member not found' });

        if (member.regionId === data.toRegionId) {
            return res.status(400).json({ message: 'You are already in this region.' });
        }

        // Check if pending transfer exists
        const existing = await prisma.transferRequest.findFirst({
            where: { memberId, status: { in: ['PENDING_ORIGIN', 'PENDING_DESTINATION'] } }
        });
        if (existing) {
            return res.status(409).json({ message: 'You already have a pending transfer request.' });
        }

        const tr = await prisma.transferRequest.create({
            data: {
                memberId,
                fromRegionId: member.regionId,
                toRegionId: data.toRegionId,
                reason: data.reason
            }
        });

        res.status(201).json({ message: 'Transfer request submitted', transfer: tr });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[TRANSFER] Error requesting transfer:', e);
        res.status(500).json({ message: 'Failed to create transfer request' });
    }
}

export const getTransfers = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        let regionIdFilter: string | null = null;

        if (!isManager) {
            const region = await prisma.region.findFirst({ where: { regionalHeadId: userId } });
            if (!region) return res.status(403).json({ message: 'Not authorized' });
            regionIdFilter = region.id;
        }

        const transfers = await prisma.transferRequest.findMany({
            where: isManager ? {} : {
                OR: [
                    { fromRegionId: regionIdFilter as string },
                    { toRegionId: regionIdFilter as string }
                ]
            },
            include: {
                member: { select: { id: true, fullName: true, fellowshipNumber: true, email: true, phoneNumber: true } },
                fromRegion: { select: { id: true, name: true } },
                toRegion: { select: { id: true, name: true } },
                originApprover: { select: { id: true, fullName: true } },
                destApprover: { select: { id: true, fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(transfers);
    } catch (e) {
        console.error('[TRANSFER] Error getting transfers:', e);
        res.status(500).json({ message: 'Failed to fetch transfers' });
    }
}

const reviewSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().optional()
});

export const reviewOrigin = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const data = reviewSchema.parse(req.body);

        const tr = await prisma.transferRequest.findUnique({ where: { id } });
        if (!tr) return res.status(404).json({ message: 'Transfer not found' });
        if (tr.status !== 'PENDING_ORIGIN') return res.status(400).json({ message: 'Transfer is not pending origin review' });

        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        if (!isManager) {
            const region = await prisma.region.findFirst({ where: { regionalHeadId: userId } });
            if (!region || region.id !== tr.fromRegionId) {
                return res.status(403).json({ message: 'Unauthorized to review this transfer' });
            }
        }

        if (data.status === 'APPROVED') {
            await prisma.$transaction(async (tx) => {
                await tx.transferRequest.update({
                    where: { id },
                    data: {
                        status: 'PENDING_DESTINATION',
                        originApproverId: userId,
                        originReviewNote: data.note,
                        originReviewedAt: new Date()
                    }
                });
                await tx.member.update({
                    where: { id: tr.memberId },
                    data: { regionId: tr.toRegionId }
                });
            });
            res.json({ message: 'Transfer approved. Member moved to destination region pending their verification.' });
        } else {
            await prisma.transferRequest.update({
                where: { id },
                data: {
                    status: 'REJECTED_BY_ORIGIN',
                    originApproverId: userId,
                    originReviewNote: data.note,
                    originReviewedAt: new Date()
                }
            });
            res.json({ message: 'Transfer rejected.' });
        }
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[TRANSFER] Error reviewing origin:', e);
        res.status(500).json({ message: 'Failed to review transfer' });
    }
}

export const reviewDestination = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const data = reviewSchema.parse(req.body);

        const tr = await prisma.transferRequest.findUnique({ where: { id } });
        if (!tr) return res.status(404).json({ message: 'Transfer not found' });
        if (tr.status !== 'PENDING_DESTINATION') return res.status(400).json({ message: 'Transfer is not pending destination review' });

        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        if (!isManager) {
            const region = await prisma.region.findFirst({ where: { regionalHeadId: userId } });
            if (!region || region.id !== tr.toRegionId) {
                return res.status(403).json({ message: 'Unauthorized to review this transfer' });
            }
        }

        if (data.status === 'APPROVED') {
            await prisma.transferRequest.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    destApproverId: userId,
                    destReviewNote: data.note,
                    destReviewedAt: new Date()
                }
            });
            res.json({ message: 'Transfer fully completed and accepted.' });
        } else {
            // Reject - bounce back
            await prisma.$transaction(async (tx) => {
                await tx.transferRequest.update({
                    where: { id: id as string },
                    data: {
                        status: 'REJECTED_BY_DESTINATION',
                        destApproverId: userId,
                        destReviewNote: data.note,
                        destReviewedAt: new Date()
                    }
                });
                await tx.member.update({
                    where: { id: tr.memberId },
                    data: { regionId: tr.fromRegionId }
                });
            });
            res.json({ message: 'Transfer rejected. Member has been bounced back to their original region.' });
        }
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[TRANSFER] Error reviewing destination:', e);
        res.status(500).json({ message: 'Failed to review transfer' });
    }
}
