import { Request, Response } from 'express';
import prisma from '../prisma';

export const checkIn = async (req: Request, res: Response) => {
    try {
        const { memberId, serviceId, method } = req.body;

        // Check if already checked in
        const existing = await prisma.attendance.findUnique({
            where: {
                memberId_serviceId: {
                    memberId,
                    serviceId,
                },
            },
        });

        if (existing) {
            return res.status(400).json({ error: 'Member already checked in' });
        }

        const attendance = await prisma.attendance.create({
            data: {
                memberId,
                serviceId,
                method,
            },
        });
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ error: 'Failed to check in' });
    }
};

export const getServiceAttendance = async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;
        const attendance = await prisma.attendance.findMany({
            where: { serviceId },
            include: { member: true },
        });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
};
