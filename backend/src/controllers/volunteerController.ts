import { Request, Response } from 'express';
import prisma from '../prisma';

// Assign a volunteer to an event
export const assignVolunteer = async (req: Request<{ eventId: string }>, res: Response) => {
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

        // Get CHECK_IN_VOLUNTEER system tag
        const checkInVolunteerTag = await prisma.tag.findUnique({
            where: { name: 'CHECK_IN_VOLUNTEER' },
        });

        if (!checkInVolunteerTag) {
            console.error('CHECK_IN_VOLUNTEER system tag not found');
        }

        // Calculate tag expiration based on event end time
        const eventDate = new Date(event.date);
        const [endHour, endMinute] = event.endTime.split(':').map(Number);
        eventDate.setHours(endHour, endMinute, 0, 0);

        // Create volunteer assignment and tag in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create volunteer assignment
            const volunteer = await tx.eventVolunteer.create({
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

            // Auto-assign CHECK_IN_VOLUNTEER tag if it exists
            if (checkInVolunteerTag) {
                const now = new Date();

                // First, auto-deactivate any expired tags to provide clean slate
                await tx.memberTag.updateMany({
                    where: {
                        memberId,
                        tagId: checkInVolunteerTag.id,
                        isActive: true,
                        expiresAt: { lt: now }, // Expired
                    },
                    data: {
                        isActive: false,
                        removedAt: now,
                        removedBy: 'SYSTEM',
                        notes: 'Auto-deactivated (expired)',
                    },
                });

                // Now check if member has an active (non-expired) tag
                const existingTag = await tx.memberTag.findFirst({
                    where: {
                        memberId,
                        tagId: checkInVolunteerTag.id,
                        isActive: true,
                    },
                });

                if (!existingTag) {
                    // No active tag - create new one (clean slate)
                    await tx.memberTag.create({
                        data: {
                            memberId,
                            tagId: checkInVolunteerTag.id,
                            assignedBy: (req as any).user.id,
                            expiresAt: eventDate,
                            notes: `Auto-assigned for event: ${event.name}`,
                        },
                    });
                }
            }

            return volunteer;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error assigning volunteer:', error);
        res.status(500).json({ error: 'Failed to assign volunteer' });
    }
};

// Remove a volunteer from an event
export const removeVolunteer = async (req: Request<{ eventId: string; memberId: string }>, res: Response) => {
    try {
        const { eventId, memberId } = req.params;

        // Get CHECK_IN_VOLUNTEER tag
        const checkInVolunteerTag = await prisma.tag.findUnique({
            where: { name: 'CHECK_IN_VOLUNTEER' },
        });

        // Remove volunteer and tag in transaction
        await prisma.$transaction(async (tx) => {
            // Delete volunteer assignment
            await tx.eventVolunteer.delete({
                where: {
                    eventId_memberId: {
                        eventId,
                        memberId,
                    },
                },
            });

            //  Remove CHECK_IN_VOLUNTEER tag if it exists and is active
            if (checkInVolunteerTag) {
                await tx.memberTag.updateMany({
                    where: {
                        memberId,
                        tagId: checkInVolunteerTag.id,
                        isActive: true,
                    },
                    data: {
                        isActive: false,
                        removedBy: (req as any).user.id,
                        removedAt: new Date(),
                        notes: `Removed from volunteer duty for event`,
                    },
                });
            }
        });

        res.json({ message: 'Volunteer removed successfully' });
    } catch (error) {
        console.error('Error removing volunteer:', error);
        res.status(500).json({ error: 'Failed to remove volunteer' });
    }
};

// List volunteers for an event
export const getEventVolunteers = async (req: Request<{ eventId: string }>, res: Response) => {
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
export const checkPermission = async (req: Request<{ eventId: string }>, res: Response) => {
    try {
        const { eventId } = req.params;
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;

        // Managers always have permission
        if (userRole === 'FELLOWSHIP_MANAGER') {
            return res.json({ hasPermission: true, role: 'MANAGER' });
        }

        //  Check if user is a volunteer for this event
        const volunteer = await prisma.eventVolunteer.findUnique({
            where: {
                eventId_memberId: {
                    eventId,
                    memberId: userId,
                },
            },
            include: {
                event: true, // Include event to check if it's ended
            },
        });

        if (volunteer) {
            // Check if event has ended
            const now = new Date();
            const eventDate = new Date(volunteer.event.date);
            const [endHours, endMinutes] = volunteer.event.endTime.split(':').map(Number);
            const eventEndTime = new Date(eventDate);
            eventEndTime.setHours(endHours, endMinutes, 0, 0);

            // Event has ended - auto-cleanup volunteer tag
            if (eventEndTime < now) {
                // Generate volunteer tag name
                const volunteerTagName = `${volunteer.event.name.toUpperCase().replace(/\s+/g, '_')}_VOLUNTEER`;

                // Find and deactivate the tag
                const volunteerTag = await prisma.tag.findFirst({
                    where: { name: volunteerTagName },
                });

                if (volunteerTag) {
                    await prisma.memberTag.deleteMany({
                        where: {
                            memberId: userId,
                            tagId: volunteerTag.id,
                            isActive: true,
                        }
                    });
                }

                // Event ended, no permission
                return res.json({ hasPermission: false, reason: 'Event has ended' });
            }

            // Event still active, has permission
            return res.json({ hasPermission: true, role: 'VOLUNTEER' });
        }

        res.json({ hasPermission: false });
    } catch (error) {
        console.error('Error checking permission:', error);
        res.status(500).json({ error: 'Failed to check permission' });
    }
};
