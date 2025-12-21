import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

// Validation schemas
const createResidenceSchema = z.object({
    name: z.string().min(1, 'Residence name is required').max(100),
    type: z.enum(['HALL', 'HOSTEL']).default('HALL'),
    regionId: z.string().uuid().optional(),
});

const updateResidenceSchema = createResidenceSchema.partial();

// Get all residences
export const getResidences = async (req: Request, res: Response) => {
    try {
        const residences = await prisma.residence.findMany({
            include: {
                _count: {
                    select: { members: true }
                },
                region: {
                    select: { name: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json(residences);
    } catch (error) {
        console.error('Get residences error:', error);
        res.status(500).json({ error: 'Failed to fetch residences' });
    }
};

// Create a new residence
export const createResidence = async (req: Request, res: Response) => {
    try {
        const validatedData = createResidenceSchema.parse(req.body);

        // Check if name already exists
        const existing = await prisma.residence.findUnique({
            where: { name: validatedData.name }
        });

        if (existing) {
            return res.status(400).json({ error: 'Residence with this name already exists' });
        }

        const residence = await prisma.residence.create({
            data: {
                name: validatedData.name,
                type: validatedData.type,
                regionId: validatedData.regionId
            }
        });

        res.status(201).json(residence);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.issues });
        }
        console.error('Create residence error:', error);
        res.status(500).json({ error: 'Failed to create residence' });
    }
};

// Update a residence
export const updateResidence = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = updateResidenceSchema.parse(req.body);

        const residence = await prisma.residence.update({
            where: { id },
            data: validatedData
        });

        res.json(residence);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.issues });
        }
        console.error('Update residence error:', error);
        res.status(500).json({ error: 'Failed to update residence' });
    }
};

// Delete a residence
export const deleteResidence = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check for associated members
        const residence = await prisma.residence.findUnique({
            where: { id },
            include: { _count: { select: { members: true } } }
        });

        if (!residence) {
            return res.status(404).json({ error: 'Residence not found' });
        }

        if (residence._count.members > 0) {
            return res.status(400).json({
                error: 'Cannot delete residence with associated members. Please reassign members first.'
            });
        }

        await prisma.residence.delete({
            where: { id }
        });

        res.json({ message: 'Residence deleted successfully' });
    } catch (error) {
        console.error('Delete residence error:', error);
        res.status(500).json({ error: 'Failed to delete residence' });
    }
};
