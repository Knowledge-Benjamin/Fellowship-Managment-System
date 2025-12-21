import { Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';

const createCourseSchema = z.object({
    name: z.string().min(1, 'Course name is required'),
    code: z.string().min(1, 'Course code is required').toUpperCase(),
});

const updateCourseSchema = z.object({
    name: z.string().min(1, 'Course name is required').optional(),
    code: z.string().min(1, 'Course code is required').toUpperCase().optional(),
});

export const getAllCourses = async (req: Request, res: Response) => {
    try {
        const courses = await prisma.course.findMany({
            include: {
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        const formattedCourses = courses.map(course => ({
            ...course,
            memberCount: course._count.members
        }));

        res.json(formattedCourses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};

export const createCourse = async (req: Request, res: Response) => {
    try {
        const validatedData = createCourseSchema.parse(req.body);

        // Check for existing course with same name or code
        const existing = await prisma.course.findFirst({
            where: {
                OR: [
                    { name: { equals: validatedData.name, mode: 'insensitive' } },
                    { code: { equals: validatedData.code, mode: 'insensitive' } }
                ]
            }
        });

        if (existing) {
            return res.status(400).json({
                error: existing.name.toLowerCase() === validatedData.name.toLowerCase()
                    ? 'Course name already exists'
                    : 'Course code already exists'
            });
        }

        const course = await prisma.course.create({
            data: validatedData
        });

        res.status(201).json(course);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0].message });
        }
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
};

export const updateCourse = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = updateCourseSchema.parse(req.body);

        // Check uniqueness if updating name or code
        if (validatedData.name || validatedData.code) {
            const existing = await prisma.course.findFirst({
                where: {
                    id: { not: id },
                    OR: [
                        validatedData.name ? { name: { equals: validatedData.name, mode: 'insensitive' } } : {},
                        validatedData.code ? { code: { equals: validatedData.code, mode: 'insensitive' } } : {}
                    ]
                }
            });

            if (existing) {
                return res.status(400).json({ error: 'Course name or code already exists' });
            }
        }

        const course = await prisma.course.update({
            where: { id },
            data: validatedData
        });

        res.json(course);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0].message });
        }
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
};

export const deleteCourse = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if course has members
        const course = await prisma.course.findUnique({
            where: { id },
            include: { _count: { select: { members: true } } }
        });

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        if (course._count.members > 0) {
            return res.status(400).json({ error: 'Cannot delete course with assigned members' });
        }

        await prisma.course.delete({ where: { id } });

        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
};
