import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

// Validation schemas
const createRegionSchema = z.object({
    name: z.string().min(1, 'Region name is required').max(100, 'Region name too long'),
});

// Get all regions
export const getRegions = async (req: Request, res: Response) => {
    try {
        const regions = await prisma.region.findMany({
            orderBy: {
                name: 'asc',
            },
            include: {
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
        });

        res.json(regions);
    } catch (error) {
        console.error('Get regions error:', error);
        res.status(500).json({ error: 'Failed to fetch regions' });
    }
};

// Create new region (manager only)
export const createRegion = async (req: Request, res: Response) => {
    try {
        // Validate input
        const validatedData = createRegionSchema.parse(req.body);

        // Check if region name already exists
        const existingRegion = await prisma.region.findUnique({
            where: { name: validatedData.name },
        });

        if (existingRegion) {
            return res.status(400).json({ error: 'Region with this name already exists' });
        }

        const region = await prisma.region.create({
            data: {
                name: validatedData.name,
            },
            include: {
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
        });

        res.status(201).json({
            message: 'Region created successfully',
            region,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.issues
            });
        }
        console.error('Create region error:', error);
        res.status(500).json({ error: 'Failed to create region' });
    }
};

// Delete region (manager only)
export const deleteRegion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid region ID' });
        }

        // Check if region exists
        const region = await prisma.region.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
        });

        if (!region) {
            return res.status(404).json({ error: 'Region not found' });
        }

        // Cannot delete region with assigned members
        if (region._count.members > 0) {
            return res.status(400).json({
                error: `Cannot delete region. ${region._count.members} member(s) are assigned to this region. Please reassign them first.`
            });
        }

        await prisma.region.delete({
            where: { id },
        });

        res.json({ message: 'Region deleted successfully' });
    } catch (error) {
        console.error('Delete region error:', error);
        res.status(500).json({ error: 'Failed to delete region' });
    }
};
