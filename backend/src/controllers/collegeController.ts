import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

// Validation schemas
const createCollegeSchema = z.object({
    name: z.string().min(1, 'College name is required').max(100),
    code: z.string().max(20).optional(),
});

const updateCollegeSchema = createCollegeSchema.partial();

// Get all colleges
export const getColleges = async (req: Request, res: Response) => {
    try {
        const colleges = await prisma.college.findMany({
            include: {
                _count: {
                    select: { courses: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json(colleges);
    } catch (error) {
        console.error('Get colleges error:', error);
        res.status(500).json({ error: 'Failed to fetch colleges' });
    }
};

// Create a new college
export const createCollege = async (req: Request, res: Response) => {
    try {
        const validatedData = createCollegeSchema.parse(req.body);

        // Check if name already exists
        const existing = await prisma.college.findUnique({
            where: { name: validatedData.name }
        });

        if (existing) {
            return res.status(400).json({ error: 'College with this name already exists' });
        }

        const college = await prisma.college.create({
            data: {
                name: validatedData.name,
                code: validatedData.code
            }
        });

        res.status(201).json(college);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.issues });
        }
        console.error('Create college error:', error);
        res.status(500).json({ error: 'Failed to create college' });
    }
};

// Update a college
export const updateCollege = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = updateCollegeSchema.parse(req.body);

        const college = await prisma.college.update({
            where: { id },
            data: validatedData
        });

        res.json(college);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.issues });
        }
        console.error('Update college error:', error);
        res.status(500).json({ error: 'Failed to update college' });
    }
};

// Delete a college
export const deleteCollege = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check for associated courses
        const college = await prisma.college.findUnique({
            where: { id },
            include: { _count: { select: { courses: true } } }
        });

        if (!college) {
            return res.status(404).json({ error: 'College not found' });
        }

        if (college._count.courses > 0) {
            return res.status(400).json({
                error: 'Cannot delete college with associated courses. Please reassign or delete the courses first.'
            });
        }

        await prisma.college.delete({
            where: { id }
        });

        res.json({ message: 'College deleted successfully' });
    } catch (error) {
        console.error('Delete college error:', error);
        res.status(500).json({ error: 'Failed to delete college' });
    }
};
