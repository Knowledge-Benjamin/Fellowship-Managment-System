import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

// Validation schemas
const checkInSchema = z.object({
    qrCode: z.string().uuid('Invalid QR code format'),
    eventId: z.string().uuid('Invalid event ID'),
    method: z.enum(['QR', 'MANUAL']),
});

const guestCheckInSchema = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    guestName: z.string().min(1, 'Guest name is required').max(100),
    guestPhone: z.string().min(10).max(15).optional(),
    purpose: z.string().max(200).optional(),
});

export const checkIn = async (req: Request, res: Response) => {
    try {
        // Validate input
        const validatedData = checkInSchema.parse(req.body);
        const { qrCode, eventId, method } = validatedData;

        // Look up member by QR code
        const member = await prisma.member.findUnique({
            where: { qrCode },
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found. Please register first.' });
        }

        // Check if event exists and is active
        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (!event.isActive) {
            return res.status(403).json({ error: 'Check-in not available. Event is not active.' });
        }

        // Check if event is currently ongoing (time-based)
        const now = new Date();
        const eventDate = new Date(event.date);
        const [startHour, startMinute] = event.startTime.split(':').map(Number);
        const [endHour, endMinute] = event.endTime.split(':').map(Number);

        const eventStart = new Date(eventDate);
        eventStart.setHours(startHour, startMinute, 0);

        const eventEnd = new Date(eventDate);
        eventEnd.setHours(endHour, endMinute, 0);

        if (now < eventStart || now > eventEnd) {
            return res.status(403).json({ error: 'Check-in not available. Event is not currently ongoing.' });
        }

        // Check if already checked in
        const existing = await prisma.attendance.findUnique({
            where: {
                memberId_eventId: {
                    memberId: member.id,
                    eventId,
                },
            },
        });

        if (existing) {
            return res.status(400).json({ error: 'You have already checked in for this event' });
        }

        const attendance = await prisma.attendance.create({
            data: {
                memberId: member.id,
                eventId,
                method,
            },
            include: {
                member: true,
                event: true,
            },
        });

        res.status(201).json({
            message: 'Check-in successful',
            attendance,
            member: {
                fullName: member.fullName,
                phoneNumber: member.phoneNumber,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.issues
            });
        }
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Failed to check in' });
    }
};

// Guest check-in (no QR code required)
export const guestCheckIn = async (req: Request, res: Response) => {
    try {
        // Validate input
        const validatedData = guestCheckInSchema.parse(req.body);
        const { eventId, guestName, guestPhone, purpose } = validatedData;

        // Check if event exists and is active
        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (!event.isActive) {
            return res.status(403).json({ error: 'Check-in not available. Event is not active.' });
        }

        if (!event.allowGuestCheckin) {
            return res.status(403).json({ error: 'Guest check-in is not allowed for this event' });
        }

        const guestAttendance = await prisma.guestAttendance.create({
            data: {
                eventId,
                guestName,
                guestPhone,
                purpose,
            },
            include: {
                event: true,
            },
        });

        res.status(201).json({
            message: 'Guest check-in successful',
            attendance: guestAttendance,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.issues
            });
        }
        console.error('Guest check-in error:', error);
        res.status(500).json({ error: 'Failed to check in guest' });
    }
};

// Get event attendance
export const getEventAttendance = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        if (!eventId || typeof eventId !== 'string') {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                attendances: {
                    include: {
                        member: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phoneNumber: true,
                                gender: true,
                                fellowshipNumber: true,
                            },
                        },
                    },
                    orderBy: {
                        checkedInAt: 'desc',
                    },
                },
                guestAttendances: {
                    orderBy: {
                        checkedInAt: 'desc',
                    },
                },
            },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json({
            event: {
                id: event.id,
                name: event.name,
                date: event.date,
            },
            memberAttendances: event.attendances,
            guestAttendances: event.guestAttendances,
            totalAttendances: event.attendances.length + event.guestAttendances.length,
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
};
