import { Request, Response } from 'express';
import prisma from '../prisma';

// Assign a volunteer to an event
export const assignVolunteer = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { memberId } = req.body;

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Check if already a volunteer
        const existing = await prisma.eventVolunteer.findUnique({
            where: {
                eventId_memberId: {
                    eventId,
                    memberId,
                },
            },
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        fellowshipNumber: true,
                    },
                },
            },
        });

        if (existing) {
            // Already a volunteer - return existing record instead of error
            return res.status(200).json(existing);
        }

        const volunteer = await prisma.eventVolunteer.create({
            data: {
                eventId,
                memberId,
            },
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        fellowshipNumber: true,
                    },
                },
            },
        });

        res.status(201).json(volunteer);
    } catch (error) {
        console.error('Error assigning volunteer:', error);
        res.status(500).json({ error: 'Failed to assign volunteer' });
    }
};

// Remove a volunteer from an event
export const removeVolunteer = async (req: Request, res: Response) => {
    try {
        const { eventId, memberId } = req.params;

        await prisma.eventVolunteer.delete({
            where: {
                eventId_memberId: {
                    eventId,
                    memberId,
                },
            },
        });

        res.json({ message: 'Volunteer removed successfully' });
    } catch (error) {
        console.error('Error removing volunteer:', error);
        res.status(500).json({ error: 'Failed to remove volunteer' });
    }
};

// List volunteers for an event
export const getEventVolunteers = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const volunteers = await prisma.eventVolunteer.findMany({
            where: { eventId },
            include: {
                member: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        fellowshipNumber: true,
                        phoneNumber: true,
                    },
                },
            },
            orderBy: {
                assignedAt: 'desc',
            },
        });

        res.json(volunteers);
    } catch (error) {
        console.error('Error fetching volunteers:', error);
        res.status(500).json({ error: 'Failed to fetch volunteers' });
    }
};

// Check if current user has permission for an event
export const checkPermission = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;

        // Managers always have permission
        if (userRole === 'FELLOWSHIP_MANAGER') {
            return res.json({ hasPermission: true, role: 'MANAGER' });
        }

        // Check if user is a volunteer for this event
        const volunteer = await prisma.eventVolunteer.findUnique({
            where: {
                eventId_memberId: {
                    eventId,
                    memberId: userId,
                },
            },
        });

        if (volunteer) {
            return res.json({ hasPermission: true, role: 'VOLUNTEER' });
        }

        res.json({ hasPermission: false });
    } catch (error) {
        console.error('Error checking permission:', error);
        res.status(500).json({ error: 'Failed to check permission' });
    }
};
