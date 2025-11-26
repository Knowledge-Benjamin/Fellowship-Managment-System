import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const checkInPermission = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const userId = req.user.id;
        const userRole = req.user.role;

        // Get eventId from body (for POST) or params (for GET)
        const eventId = req.body?.eventId || req.params?.eventId;

        if (!eventId) {
            res.status(400).json({ error: 'Event ID is required' });
            return;
        }

        // Managers always have permission (can check-in anytime, even outside event hours)
        if (userRole === 'FELLOWSHIP_MANAGER') {
            next();
            return;
        }

        // For non-managers, check if they're a volunteer for this event
        const volunteer = await prisma.eventVolunteer.findUnique({
            where: {
                eventId_memberId: {
                    eventId,
                    memberId: userId,
                },
            },
        });

        if (!volunteer) {
            res.status(403).json({
                error: 'Not authorized to perform check-in for this event'
            });
            return;
        }

        // Volunteers found - validate event is active
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: {
                isActive: true,
                date: true,
                startTime: true,
                endTime: true,
            },
        });

        if (!event) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }

        // Check if event is active
        if (!event.isActive) {
            res.status(403).json({
                error: 'This event is not currently active for check-ins'
            });
            return;
        }

        // Validate event date is today
        const eventDate = new Date(event.date);
        const today = new Date();
        eventDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (eventDate.getTime() !== today.getTime()) {
            res.status(403).json({
                error: 'Check-in is only allowed on the event date'
            });
            return;
        }

        // All checks passed for volunteer
        next();
    } catch (error) {
        console.error('Error checking check-in permission:', error);
        res.status(500).json({ error: 'Failed to verify permissions' });
    }
};
