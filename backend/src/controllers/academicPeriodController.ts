import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

const createPeriodSchema = z.object({
    academicYear: z.string().regex(/^\d{4}\/\d{4}$/, 'Must be in format YYYY/YYYY'),
    periodNumber: z.number().int().min(1).max(2),
    periodName: z.string().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
});

const updatePeriodSchema = z.object({
    periodName: z.string().min(1).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
});

/**
 * Get all academic periods
 */
export const getAllPeriods = async (req: Request, res: Response) => {
    try {
        const periods = await prisma.academicPeriod.findMany({
            orderBy: [
                { academicYear: 'desc' },
                { periodNumber: 'asc' },
            ],
        });

        res.json(periods);
    } catch (error) {
        console.error('Error fetching academic periods:', error);
        res.status(500).json({ error: 'Failed to fetch academic periods' });
    }
};

/**
 * Get current active period
 */
export const getCurrentPeriod = async (req: Request, res: Response) => {
    try {
        const now = new Date();

        const activePeriod = await prisma.academicPeriod.findFirst({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
            },
        });

        if (!activePeriod) {
            return res.status(404).json({ error: 'No active academic period found' });
        }

        res.json(activePeriod);
    } catch (error) {
        console.error('Error fetching current period:', error);
        res.status(500).json({ error: 'Failed to fetch current period' });
    }
};

/**
 * Create new academic period
 */
export const createPeriod = async (req: Request, res: Response) => {
    try {
        const validatedData = createPeriodSchema.parse(req.body);

        // Check if period already exists
        const existing = await prisma.academicPeriod.findUnique({
            where: {
                academicYear_periodNumber: {
                    academicYear: validatedData.academicYear,
                    periodNumber: validatedData.periodNumber,
                },
            },
        });

        if (existing) {
            return res.status(400).json({
                error: `Period ${validatedData.periodNumber} for ${validatedData.academicYear} already exists`
            });
        }

        // Validate dates
        const startDate = new Date(validatedData.startDate);
        const endDate = new Date(validatedData.endDate);

        if (endDate <= startDate) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }

        const period = await prisma.academicPeriod.create({
            data: {
                academicYear: validatedData.academicYear,
                periodNumber: validatedData.periodNumber,
                periodName: validatedData.periodName,
                startDate,
                endDate,
            },
        });

        res.status(201).json(period);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error creating academic period:', error);
        res.status(500).json({ error: 'Failed to create academic period' });
    }
};

/**
 * Update academic period
 */
export const updatePeriod = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = updatePeriodSchema.parse(req.body);

        // Check if period exists
        const existing = await prisma.academicPeriod.findUnique({
            where: { id },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Academic period not found' });
        }

        // Validate dates if provided
        if (validatedData.startDate || validatedData.endDate) {
            const startDate = validatedData.startDate
                ? new Date(validatedData.startDate)
                : existing.startDate;
            const endDate = validatedData.endDate
                ? new Date(validatedData.endDate)
                : existing.endDate;

            if (endDate <= startDate) {
                return res.status(400).json({ error: 'End date must be after start date' });
            }
        }

        const updated = await prisma.academicPeriod.update({
            where: { id },
            data: {
                ...(validatedData.periodName && { periodName: validatedData.periodName }),
                ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
                ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
            },
        });

        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error updating academic period:', error);
        res.status(500).json({ error: 'Failed to update academic period' });
    }
};

/**
 * Delete academic period
 */
export const deletePeriod = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } = req.params;

        // Check if period exists
        const existing = await prisma.academicPeriod.findUnique({
            where: { id },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Academic period not found' });
        }

        // Don't allow deletion of past or current periods
        const now = new Date();
        if (existing.endDate < now) {
            return res.status(400).json({
                error: 'Cannot delete past academic periods'
            });
        }

        await prisma.academicPeriod.delete({
            where: { id },
        });

        res.json({ message: 'Academic period deleted successfully' });
    } catch (error) {
        console.error('Error deleting academic period:', error);
        res.status(500).json({ error: 'Failed to delete academic period' });
    }
};
