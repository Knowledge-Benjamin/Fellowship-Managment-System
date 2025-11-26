import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

// Validation schemas
const bookTransportSchema = z.object({
    memberId: z.string().uuid('Invalid member ID'),
    eventId: z.string().uuid('Invalid event ID'),
    pickupPoint: z.string().min(1, 'Pickup point is required').max(200),
});

export const bookTransport = async (req: Request, res: Response) => {
    try {
        // Validate input
        const validatedData = bookTransportSchema.parse(req.body);
        const { memberId, eventId, pickupPoint } = validatedData;

        // Verify member exists
        const member = await prisma.member.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Verify event exists
        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if already booked
        const existing = await prisma.transportBooking.findUnique({
            where: {
                memberId_eventId: {
                    memberId,
                    eventId,
                },
            },
        });

        if (existing) {
            return res.status(400).json({ error: 'You have already booked transport for this event' });
        }

        const booking = await prisma.transportBooking.create({
            data: {
                memberId,
                eventId,
                pickupPoint,
            },
            include: {
                member: {
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
                    },
                },
            },
        });

        res.status(201).json({
            message: 'Transport booked successfully',
            booking,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.issues
            });
        }
        console.error('Transport booking error:', error);
        res.status(500).json({ error: 'Failed to book transport' });
    }
};

export const getTransportList = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        if (!eventId || typeof eventId !== 'string') {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const bookings = await prisma.transportBooking.findMany({
            where: { eventId },
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        phoneNumber: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                pickupPoint: 'asc',
            },
        });

        res.json({
            eventId,
            totalBookings: bookings.length,
            bookings,
        });
    } catch (error) {
        console.error('Get transport list error:', error);
        res.status(500).json({ error: 'Failed to fetch transport list' });
    }
};
