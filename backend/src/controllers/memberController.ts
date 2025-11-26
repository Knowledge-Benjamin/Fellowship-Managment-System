import { Request, Response } from 'express';
import prisma from '../prisma';

// Get all members (with optional search)
export const getMembers = async (req: Request, res: Response) => {
    try {
        const { search } = req.query;

        const where = search
            ? {
                OR: [
                    { fullName: { contains: search as string, mode: 'insensitive' as const } },
                    { email: { contains: search as string, mode: 'insensitive' as const } },
                    { fellowshipNumber: { contains: search as string, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const members = await prisma.member.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                fellowshipNumber: true,
                phoneNumber: true,
                role: true,
            },
            orderBy: {
                fullName: 'asc',
            },
            take: 20, // Limit results
        });

        res.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
};
