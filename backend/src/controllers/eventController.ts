import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { getEventStatus } from '../utils/timezone';

// Validation schemas
const createEventSchema = z.object({
    name: z.string().min(1, 'Event name is required').max(100),
    date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
    type: z.enum(['TUESDAY_FELLOWSHIP', 'THURSDAY_PHANEROO']),
    venue: z.string().max(200).optional().transform(val => val === '' ? undefined : val),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.string().optional().transform(val => val === '' ? undefined : val),
    allowGuestCheckin: z.boolean().optional(),
});

const updateEventSchema = createEventSchema.partial();



// Create a new event
export const createEvent = async (req: Request, res: Response) => {
    try {
        // Validate input
        const validatedData = createEventSchema.parse(req.body);

        const event = await prisma.event.create({
            data: {
                name: validatedData.name,
                date: new Date(validatedData.date),
                startTime: validatedData.startTime,
                endTime: validatedData.endTime,
                type: validatedData.type,
                venue: validatedData.venue,
                isRecurring: validatedData.isRecurring || false,
                recurrenceRule: validatedData.isRecurring ? validatedData.recurrenceRule : null,
                allowGuestCheckin: validatedData.allowGuestCheckin || false,
                isActive: false,
            },
        });

        res.status(201).json({
            message: 'Event created successfully',
            event,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.issues
            });
        }
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
};

// Get all events with optional filters
export const getEvents = async (req: Request, res: Response) => {
    try {
        const { isActive, type, upcoming } = req.query;

        const where: any = {};

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        if (type && (type === 'TUESDAY_FELLOWSHIP' || type === 'THURSDAY_PHANEROO')) {
            where.type = type;
        }

        if (upcoming === 'true') {
            where.date = {
                gte: new Date(),
            };
        }

        const events = await prisma.event.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                _count: {
                    select: {
                        attendances: true,
                        guestAttendances: true,
                    },
                },
            },
        });

        const eventsWithStatus = events.map(event => ({
            ...event,
            status: getEventStatus(event),
        }));

        res.json(eventsWithStatus);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
};

// Get active event (currently running)
export const getActiveEvent = async (req: Request, res: Response) => {
    try {
        const activeEvent = await prisma.event.findFirst({
            where: { isActive: true },
            include: {
                _count: {
                    select: {
                        attendances: true,
                        guestAttendances: true,
                    },
                },
            },
        });

        if (!activeEvent) {
            return res.status(404).json({ error: 'No active event found' });
        }

        res.json({
            ...activeEvent,
            status: getEventStatus(activeEvent),
        });
    } catch (error) {
        console.error('Get active event error:', error);
        res.status(500).json({ error: 'Failed to fetch active event' });
    }
};

// Get single event by ID
export const getEventById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                attendances: {
                    include: {
                        member: true,
                    },
                },
                guestAttendances: true,
                _count: {
                    select: {
                        attendances: true,
                        guestAttendances: true,
                        transportBookings: true,
                    },
                },
            },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json({
            ...event,
            status: getEventStatus(event),
        });
    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
};

// Update event
export const updateEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        // Validate input
        const validatedData = updateEventSchema.parse(req.body);

        const updateData: any = { ...validatedData };

        // Convert date string to Date object if present
        if (updateData.date) {
            updateData.date = new Date(updateData.date);
        }

        const event = await prisma.event.update({
            where: { id },
            data: updateData,
        });

        res.json({
            message: 'Event updated successfully',
            event,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.issues
            });
        }
        console.error('Update event error:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
};

// Delete event
export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        await prisma.event.delete({
            where: { id },
        });

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
};

// Toggle event active status
export const toggleEventActive = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await prisma.event.findUnique({ where: { id } });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const updatedEvent = await prisma.event.update({
            where: { id },
            data: { isActive: !event.isActive },
        });

        res.json({
            message: `Event ${updatedEvent.isActive ? 'activated' : 'deactivated'} successfully`,
            event: updatedEvent,
        });
    } catch (error) {
        console.error('Toggle event active error:', error);
        res.status(500).json({ error: 'Failed to toggle event status' });
    }
};

// Toggle guest check-in for event
export const toggleGuestCheckin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await prisma.event.findUnique({ where: { id } });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const updatedEvent = await prisma.event.update({
            where: { id },
            data: { allowGuestCheckin: !event.allowGuestCheckin },
        });

        res.json({
            message: `Guest check-in ${updatedEvent.allowGuestCheckin ? 'enabled' : 'disabled'} for event`,
            event: updatedEvent,
        });
    } catch (error) {
        console.error('Toggle guest check-in error:', error);
        res.status(500).json({ error: 'Failed to toggle guest check-in' });
    }
};
