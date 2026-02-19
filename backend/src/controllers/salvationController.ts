import { Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';

// Validation Schemas
const createSalvationSchema = z.object({
    eventId: z.string().uuid(),
    memberId: z.string().uuid().optional(),
    guestName: z.string().optional(),
    guestPhone: z.string().optional(),
    guestEmail: z.string().email().optional().nullable(),
    counselorId: z.string().uuid().optional(),
    decisionType: z.enum(['SALVATION', 'REDEDICATION', 'BAPTISM_INTEREST', 'PRAYER_REQUEST']),
    baptismInterest: z.boolean().optional(),
    notes: z.string().optional(),
}).refine((data) => data.memberId || data.guestName, {
    message: 'Either memberId or guestName must be provided',
});

const updateSalvationSchema = z.object({
    followUpStatus: z.enum(['PENDING', 'FIRST_CONTACT_MADE', 'ONGOING_DISCIPLESHIP', 'BAPTIZED', 'INTEGRATED', 'LOST_CONTACT']).optional(),
    firstContactDate: z.string().datetime().optional(),
    baptismInterest: z.boolean().optional(),
    baptismDate: z.string().datetime().optional(),
    assignedToSmallGroup: z.boolean().optional(),
    smallGroupName: z.string().optional(),
    notes: z.string().optional(),
    testimony: z.string().optional(),
});

/**
 * Create a new salvation record
 * POST /api/salvations
 */
export const createSalvation = async (req: Request, res: Response) => {
    try {
        const validatedData = createSalvationSchema.parse(req.body);
        const userId = (req as any).user?.id;

        const salvation = await prisma.salvation.create({
            data: {
                ...validatedData,
                createdBy: userId,
            },
            include: {
                member: true,
                counselor: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        name: true,
                        date: true,
                    },
                },
            },
        });

        res.status(201).json(salvation);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Create salvation error:', error);
        res.status(500).json({ error: 'Failed to create salvation record' });
    }
};

/**
 * Get all salvations with optional filters
 * GET /api/salvations?eventId=&status=&startDate=&endDate=
 */
export const getAllSalvations = async (req: Request, res: Response) => {
    try {
        const { eventId, status, startDate, endDate, decisionType } = req.query;

        const where: any = {};

        if (eventId) {
            where.eventId = eventId as string;
        }

        if (status) {
            where.followUpStatus = status;
        }

        if (decisionType) {
            where.decisionType = decisionType;
        }

        if (startDate && endDate) {
            where.decisionDate = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        const salvations = await prisma.salvation.findMany({
            where,
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        phoneNumber: true,
                        email: true,
                    },
                },
                counselor: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        name: true,
                        date: true,
                        type: true,
                    },
                },
            },
            orderBy: {
                decisionDate: 'desc',
            },
        });

        res.json(salvations);
    } catch (error) {
        console.error('Get salvations error:', error);
        res.status(500).json({ error: 'Failed to retrieve salvations' });
    }
};

/**
 * Get salvation by ID
 * GET /api/salvations/:id
 */
export const getSalvationById = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } = req.params;

        const salvation = await prisma.salvation.findUnique({
            where: { id },
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        phoneNumber: true,
                        email: true,
                        region: true,
                    },
                },
                counselor: {
                    select: {
                        id: true,
                        fullName: true,
                        phoneNumber: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        name: true,
                        date: true,
                        type: true,
                        venue: true,
                    },
                },
            },
        });

        if (!salvation) {
            return res.status(404).json({ error: 'Salvation record not found' });
        }

        res.json(salvation);
    } catch (error) {
        console.error('Get salvation error:', error);
        res.status(500).json({ error: 'Failed to retrieve salvation' });
    }
};

/**
 * Update salvation record
 * PUT /api/salvations/:id
 */
export const updateSalvation = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = updateSalvationSchema.parse(req.body);

        const salvation = await prisma.salvation.update({
            where: { id },
            data: {
                ...validatedData,
                firstContactDate: validatedData.firstContactDate
                    ? new Date(validatedData.firstContactDate)
                    : undefined,
                baptismDate: validatedData.baptismDate
                    ? new Date(validatedData.baptismDate)
                    : undefined,
            },
            include: {
                member: true,
                counselor: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        name: true,
                        date: true,
                    },
                },
            },
        });

        res.json(salvation);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Update salvation error:', error);
        res.status(500).json({ error: 'Failed to update salvation record' });
    }
};

/**
 * Delete salvation record
 * DELETE /api/salvations/:id
 */
export const deleteSalvation = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.salvation.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete salvation error:', error);
        res.status(500).json({ error: 'Failed to delete salvation record' });
    }
};

/**
 * Get salvation statistics
 * GET /api/salvations/stats
 */
export const getSalvationStats = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const where: any = {};

        if (startDate && endDate) {
            where.decisionDate = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        const [
            totalSalvations,
            salvationsByType,
            salvationsByStatus,
            pendingFollowUps,
            baptismInterested,
        ] = await Promise.all([
            prisma.salvation.count({ where }),
            prisma.salvation.groupBy({
                by: ['decisionType'],
                where,
                _count: true,
            }),
            prisma.salvation.groupBy({
                by: ['followUpStatus'],
                where,
                _count: true,
            }),
            prisma.salvation.count({
                where: {
                    ...where,
                    followUpStatus: 'PENDING',
                },
            }),
            prisma.salvation.count({
                where: {
                    ...where,
                    baptismInterest: true,
                },
            }),
        ]);

        res.json({
            totalSalvations,
            salvationsByType,
            salvationsByStatus,
            pendingFollowUps,
            baptismInterested,
        });
    } catch (error) {
        console.error('Get salvation stats error:', error);
        res.status(500).json({ error: 'Failed to retrieve salvation statistics' });
    }
};
