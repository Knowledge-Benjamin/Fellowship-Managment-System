import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { formatRegionsForDisplay, formatRegionForDisplay } from '../utils/displayFormatters';

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

        // Transform region names for display (uppercase, Central gets suffix)
        const formattedRegions = formatRegionsForDisplay(regions);

        res.json(formattedRegions);
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

        // Transform region name for display
        const formattedRegion = formatRegionForDisplay(region);

        res.status(201).json({
            message: 'Region created successfully',
            region: formattedRegion,
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

// Get region for current Regional Head
export const getMyRegion = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find region where this user is the regional head
        const region = await prisma.region.findFirst({
            where: { regionalHeadId: userId },
            include: {
                families: {
                    where: { isActive: true },
                    include: {
                        familyHead: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                        _count: {
                            select: {
                                members: {
                                    where: { isActive: true },
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
        });

        if (!region) {
            return res.status(404).json({ error: 'You are not assigned as a regional head' });
        }

        // Calculate stats
        const members = await prisma.member.findMany({
            where: { regionId: region.id },
            select: { gender: true },
        });

        const stats = {
            totalMembers: members.length,
            maleCount: members.filter(m => m.gender === 'MALE').length,
            femaleCount: members.filter(m => m.gender === 'FEMALE').length,
            totalFamilies: region.families.length,
        };

        // Transform region name for display
        const formattedRegion = formatRegionForDisplay(region);

        res.json({
            ...formattedRegion,
            stats,
        });
    } catch (error) {
        console.error('Get my region error:', error);
        res.status(500).json({ error: 'Failed to fetch region data' });
    }
};

