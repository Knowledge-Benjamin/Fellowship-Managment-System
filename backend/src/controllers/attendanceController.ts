import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { getNowInEAT, getEventTimeInEAT } from '../utils/timezone';
import { activeMemberFilter } from '../utils/queryHelpers';

// Validation schemas
const checkInSchema = z.object({
    qrCode: z.string().uuid('Invalid QR code format').optional(),
    fellowshipNumber: z.string().min(6).max(6).optional(),
    eventId: z.string().uuid('Invalid event ID'),
    method: z.enum(['QR', 'FELLOWSHIP_NUMBER', 'MANUAL']),
}).refine(
    (data) => data.qrCode || data.fellowshipNumber,
    { message: 'Either qrCode or fellowshipNumber must be provided' }
);

const guestCheckInSchema = z.object({
    eventId: z.string().uuid('Invalid event ID'),
    guestName: z.string().min(1, 'Guest name is required').max(100),
    guestPhone: z.string().min(10).max(15).optional(),
    purpose: z.string().max(200).optional(),
});

const offlineSyncSchema = z.array(z.object({
    memberId: z.string().uuid('Invalid member ID'),
    eventId: z.string().uuid('Invalid event ID'),
    method: z.enum(['QR', 'FELLOWSHIP_NUMBER', 'MANUAL']),
    timestamp: z.string().datetime(),
}));

export const checkIn = async (req: Request, res: Response) => {
    try {
        // Validate input
        const validatedData = checkInSchema.parse(req.body);
        const { qrCode, fellowshipNumber, eventId, method } = validatedData;

        // Look up member by QR code or fellowship number
        const member = await prisma.member.findUnique({
            where: qrCode ? { qrCode } : { fellowshipNumber },
            include: {
                region: true,
            },
        });

        if (!member || member.isDeleted) {
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
        // Using EAT (UTC+3) for time comparison
        const now = getNowInEAT();

        const eventDate = new Date(event.date);
        const eventStart = getEventTimeInEAT(eventDate, event.startTime);
        const eventEnd = getEventTimeInEAT(eventDate, event.endTime);

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

        // Auto-remove PENDING_FIRST_ATTENDANCE tag if this is their first attendance
        const firstTimerTag = await prisma.memberTag.findFirst({
            where: {
                memberId: member.id,
                tag: { name: 'PENDING_FIRST_ATTENDANCE' },
                isActive: true,
            },
            include: { tag: true },
        });

        if (firstTimerTag) {
            await prisma.memberTag.update({
                where: { id: firstTimerTag.id },
                data: {
                    isActive: false,
                    removedAt: new Date(),
                    removedBy: member.id, // Self-removed upon first attendance
                },
            });
            console.log(`[FIRST-TIMER] Tag removed for member ${member.fullName} after first attendance at event ${event.name}`);
        }

        res.status(201).json({
            message: 'Check-in successful',
            attendance,
            member: {
                id: member.id,
                fullName: member.fullName,
                fellowshipNumber: member.fellowshipNumber,
                phoneNumber: member.phoneNumber,
                region: member.region,
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

// Get all members with check-in status for manual check-in (Managers only)
export const getMembersForCheckIn = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { search, regionId, gender, status } = req.query;

        if (!eventId || typeof eventId !== 'string') {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        // Verify event exists
        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Build where clause for member filtering
        const memberWhere: any = {};

        if (search && typeof search === 'string') {
            memberWhere.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { fellowshipNumber: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (regionId && typeof regionId === 'string') {
            memberWhere.regionId = regionId;
        }

        if (gender && (gender === 'MALE' || gender === 'FEMALE')) {
            memberWhere.gender = gender;
        }

        // Fetch all active members with attendance status
        const members = await prisma.member.findMany({
            where: {
                ...memberWhere,
                ...activeMemberFilter
            },
            include: {
                region: true,
                attendances: {
                    where: { eventId },
                    select: {
                        id: true,
                        checkedInAt: true,
                        method: true,
                    },
                },
            },
            orderBy: {
                fullName: 'asc',
            },
        });

        // Transform data to include check-in status
        const membersWithStatus = members.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            fellowshipNumber: member.fellowshipNumber,
            email: member.email,
            phoneNumber: member.phoneNumber,
            gender: member.gender,
            region: member.region,
            isCheckedIn: member.attendances.length > 0,
            checkInTime: member.attendances[0]?.checkedInAt || null,
            checkInMethod: member.attendances[0]?.method || null,
        }));

        // Filter by status if requested
        let filteredMembers = membersWithStatus;
        if (status === 'checked-in') {
            filteredMembers = membersWithStatus.filter((m) => m.isCheckedIn);
        } else if (status === 'not-checked-in') {
            filteredMembers = membersWithStatus.filter((m) => !m.isCheckedIn);
        }

        res.json({
            eventId,
            eventName: event.name,
            totalMembers: filteredMembers.length,
            members: filteredMembers,
        });
    } catch (error) {
        console.error('Get members for check-in error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
};

// ===================================
// OFFLINE PWA CAPABILITIES
// ===================================

/**
 * GET /api/attendance/:eventId/offline-roster
 * Fetches lightweight, active member roster for IndexedDB caching
 */
export const getOfflineRoster = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        if (!eventId || typeof eventId !== 'string') return res.status(400).json({ error: 'Invalid event ID' });

        // Ensure event exists
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        // Fetch lightweight record of ALL active members
        const members = await prisma.member.findMany({
            where: { ...activeMemberFilter },
            select: {
                id: true,
                fullName: true,
                fellowshipNumber: true,
                phoneNumber: true,
                qrCode: true,
                region: { select: { id: true, name: true } },
            },
        });

        res.json({ eventId, members });
    } catch (error) {
        console.error('Offline Roster error:', error);
        res.status(500).json({ error: 'Failed to load offline roster' });
    }
};

/**
 * POST /api/attendance/sync-batch
 * Accepts an array of offline check-ins and sinks them idempotently.
 */
export const syncOfflineBatch = async (req: Request, res: Response) => {
    try {
        const records = offlineSyncSchema.parse(req.body);

        if (records.length === 0) return res.json({ message: 'No records to sync', syncedCount: 0 });

        // Ensure we are syncing to an event that actually exists and is active
        const eventId = records[0].eventId;
        const event = await prisma.event.findUnique({ where: { id: eventId } });

        if (!event) return res.status(404).json({ error: 'Event not found' });

        // We skip time validations intentionally because these are offline scans
        // that could have happened hours ago.

        let syncedCount = 0;
        let errors = [];

        // We process sequentially (or using createMany if possible, but we need side-effects for first timers)
        for (const record of records) {
            try {
                // Check if already checked in (duplicate sync prevention)
                const existing = await prisma.attendance.findUnique({
                    where: { memberId_eventId: { memberId: record.memberId, eventId } },
                });

                if (existing) continue; // Ignore if they already synced

                await prisma.attendance.create({
                    data: {
                        memberId: record.memberId,
                        eventId: eventId,
                        method: record.method,
                        checkedInAt: new Date(record.timestamp), // Use the offline real time
                    },
                });

                // Auto-remove PENDING_FIRST_ATTENDANCE
                const firstTimerTag = await prisma.memberTag.findFirst({
                    where: { memberId: record.memberId, tag: { name: 'PENDING_FIRST_ATTENDANCE' }, isActive: true },
                    include: { tag: true },
                });

                if (firstTimerTag) {
                    await prisma.memberTag.update({
                        where: { id: firstTimerTag.id },
                        data: { isActive: false, removedAt: new Date(), removedBy: record.memberId },
                    });
                }

                syncedCount++;
            } catch (err) {
                console.error(`Failed to sync offline record: ${record.memberId}`, err);
                errors.push({ memberId: record.memberId, error: 'Database error' });
            }
        }

        res.json({
            message: 'Batch sync complete',
            syncedCount,
            totalReceived: records.length,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid batch array format', details: error.issues });
        console.error('Offline sync error:', error);
        res.status(500).json({ error: 'Failed to process sync batch' });
    }
};
