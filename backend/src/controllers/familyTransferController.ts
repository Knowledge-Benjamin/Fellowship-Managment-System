import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

const createSchema = z.object({
    toFamilyId: z.string().uuid(),
    reason: z.string().min(5).max(500).optional(),
});

export const requestTransfer = async (req: Request, res: Response) => {
    try {
        const memberId = req.user?.id;
        if (!memberId) return res.status(401).json({ message: 'Unauthorized' });

        const data = createSchema.parse(req.body);

        // Find active family membership
        const activeMembership = await prisma.familyMember.findFirst({
            where: { memberId, isActive: true },
            include: { family: true }
        });

        if (!activeMembership) {
            return res.status(400).json({ message: 'You are not currently in an active family to transfer from.' });
        }

        if (activeMembership.familyId === data.toFamilyId) {
            return res.status(400).json({ message: 'You are already in this family.' });
        }

        // Check if pending transfer exists
        const existing = await prisma.familyTransferRequest.findFirst({
            where: { memberId, status: { in: ['PENDING_ORIGIN', 'PENDING_DESTINATION'] } }
        });
        if (existing) {
            return res.status(409).json({ message: 'You already have a pending family transfer request.' });
        }

        const tr = await prisma.familyTransferRequest.create({
            data: {
                memberId,
                fromFamilyId: activeMembership.familyId,
                toFamilyId: data.toFamilyId,
                reason: data.reason
            }
        });

        res.status(201).json({ message: 'Family transfer request submitted', transfer: tr });
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[FAMILY_TRANSFER] Error requesting transfer:', e);
        res.status(500).json({ message: 'Failed to create family transfer request' });
    }
}

export const getTransfers = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        let familyIdsHead: string[] = [];

        if (!isManager) {
            const families = await prisma.familyGroup.findMany({ where: { familyHeadId: userId }, select: { id: true } });
            if (!families.length) return res.status(403).json({ message: 'Not authorized' });
            familyIdsHead = families.map(f => f.id);
        }

        const transfers = await prisma.familyTransferRequest.findMany({
            where: isManager ? {} : {
                OR: [
                    { fromFamilyId: { in: familyIdsHead } },
                    { toFamilyId: { in: familyIdsHead } }
                ]
            },
            include: {
                member: { select: { id: true, fullName: true, fellowshipNumber: true, email: true, phoneNumber: true } },
                fromFamily: { select: { id: true, name: true } },
                toFamily: { select: { id: true, name: true } },
                originApprover: { select: { id: true, fullName: true } },
                destApprover: { select: { id: true, fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(transfers);
    } catch (e) {
        console.error('[FAMILY_TRANSFER] Error getting transfers:', e);
        res.status(500).json({ message: 'Failed to fetch family transfers' });
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

        const tr = await prisma.familyTransferRequest.findUnique({ where: { id: id as string } });
        if (!tr) return res.status(404).json({ message: 'Transfer not found' });
        if (tr.status !== 'PENDING_ORIGIN') return res.status(400).json({ message: 'Transfer is not pending origin review' });

        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        if (!isManager) {
            const family = await prisma.familyGroup.findFirst({ where: { id: tr.fromFamilyId, familyHeadId: userId } });
            if (!family) {
                return res.status(403).json({ message: 'Unauthorized to review this transfer from origin' });
            }
        }

        if (data.status === 'APPROVED') {
            await prisma.$transaction(async (tx) => {
                await tx.familyTransferRequest.update({
                    where: { id },
                    data: {
                        status: 'PENDING_DESTINATION',
                        originApproverId: userId,
                        originReviewNote: data.note,
                        originReviewedAt: new Date()
                    }
                });
                // Deactivate current membership
                await tx.familyMember.updateMany({
                    where: { memberId: tr.memberId, familyId: tr.fromFamilyId, isActive: true },
                    data: { isActive: false, leftAt: new Date() }
                });
                // Create intermediate link in new family so they appear there. Wait, updating a composite unique might fail if they already joined and left toFamily. 
                // Best approach: If they have an inactive record in `toFamilyId`, reactivate it, otherwise create.
                const existingDest = await tx.familyMember.findFirst({
                    where: { memberId: tr.memberId, familyId: tr.toFamilyId }
                });
                if (existingDest) {
                    await tx.familyMember.updateMany({
                        where: { memberId: tr.memberId, familyId: tr.toFamilyId },
                        data: { isActive: true, joinedAt: new Date(), leftAt: null, assignedBy: userId }
                    });
                } else {
                    await tx.familyMember.create({
                        data: {
                            familyId: tr.toFamilyId,
                            memberId: tr.memberId,
                            isActive: true,
                            assignedBy: userId,
                            notes: 'Transferred strictly pending final acceptance'
                        }
                    });
                }
            });
            res.json({ message: 'Transfer approved. Member moved to destination family pending acceptance.' });
        } else {
            await prisma.familyTransferRequest.update({
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
        console.error('[FAMILY_TRANSFER] Error reviewing origin:', e);
        res.status(500).json({ message: 'Failed to review transfer' });
    }
}

export const reviewDestination = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const data = reviewSchema.parse(req.body);

        const tr = await prisma.familyTransferRequest.findUnique({ where: { id: id as string } });
        if (!tr) return res.status(404).json({ message: 'Transfer not found' });
        if (tr.status !== 'PENDING_DESTINATION') return res.status(400).json({ message: 'Transfer is not pending destination review' });

        const isManager = req.user?.role === 'FELLOWSHIP_MANAGER';
        if (!isManager) {
            const family = await prisma.familyGroup.findFirst({ where: { id: tr.toFamilyId, familyHeadId: userId } });
            if (!family) {
                return res.status(403).json({ message: 'Unauthorized to review this transfer to destination' });
            }
        }

        if (data.status === 'APPROVED') {
            await prisma.familyTransferRequest.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    destApproverId: userId,
                    destReviewNote: data.note,
                    destReviewedAt: new Date()
                }
            });
            res.json({ message: 'Transfer fully completed and member accepted into your family.' });
        } else {
            // Reject - bounce back
            await prisma.$transaction(async (tx) => {
                await tx.familyTransferRequest.update({
                    where: { id },
                    data: {
                        status: 'REJECTED_BY_DESTINATION',
                        destApproverId: userId,
                        destReviewNote: data.note,
                        destReviewedAt: new Date()
                    }
                });
                
                // Deactivate the tentative destination record
                await tx.familyMember.updateMany({
                    where: { memberId: tr.memberId, familyId: tr.toFamilyId, isActive: true },
                    data: { isActive: false, leftAt: new Date() }
                });
                
                // Restore origin family
                const existingOrigin = await tx.familyMember.findFirst({
                    where: { memberId: tr.memberId, familyId: tr.fromFamilyId }
                });
                if (existingOrigin) {
                    await tx.familyMember.updateMany({
                        where: { memberId: tr.memberId, familyId: tr.fromFamilyId },
                        data: { isActive: true, leftAt: null, assignedBy: userId }
                    });
                } else {
                    // Fallback
                    await tx.familyMember.create({
                        data: {
                            familyId: tr.fromFamilyId,
                            memberId: tr.memberId,
                            isActive: true,
                            assignedBy: userId,
                            notes: 'Retrieved from bounced transfer'
                        }
                    });
                }
            });
            res.json({ message: 'Transfer rejected. Member bounced back to original family.' });
        }
    } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', details: e.issues });
        console.error('[FAMILY_TRANSFER] Error reviewing destination:', e);
        res.status(500).json({ message: 'Failed to review transfer' });
    }
}
