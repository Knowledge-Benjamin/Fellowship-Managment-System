import { Request, Response } from 'express';
import prisma from '../prisma';

export const bookTransport = async (req: Request, res: Response) => {
    try {
        const { memberId, serviceId, pickupPoint } = req.body;

        const booking = await prisma.transportBooking.create({
            data: {
                memberId,
                serviceId,
                pickupPoint,
            },
        });
        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to book transport' });
    }
};

export const getTransportList = async (req: Request, res: Response) => {
    try {
        const { serviceId } = req.params;
        const bookings = await prisma.transportBooking.findMany({
            where: { serviceId },
            include: { member: true },
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transport list' });
    }
};
