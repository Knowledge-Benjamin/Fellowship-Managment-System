import { Request, Response } from 'express';
import prisma from '../prisma';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

// Helper to calculate event status
const getEventStatus = (event: any) => {
    const now = new Date();
    const eventDate = new Date(event.date);
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);

    const eventStart = new Date(eventDate);
    eventStart.setHours(startHour, startMinute, 0);

    const eventEnd = new Date(eventDate);
    eventEnd.setHours(endHour, endMinute, 0);

    if (now < eventStart) return 'UPCOMING';
    if (now >= eventStart && now <= eventEnd) return 'ONGOING';
    return 'PAST';
};

export const getEventReport = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                attendances: {
                    include: {
                        member: {
                            include: {
                                region: true
                            }
                        },
                    },
                },
                guestAttendances: true,
            },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // 1. Total Attendance
        const memberCount = event.attendances.length;
        const guestCount = event.guestAttendances.length;
        const totalAttendance = memberCount + guestCount;

        // 2. Gender Breakdown
        const genderBreakdown = event.attendances.reduce(
            (acc, curr) => {
                const gender = curr.member.gender;
                acc[gender] = (acc[gender] || 0) + 1;
                return acc;
            },
            { MALE: 0, FEMALE: 0 } as Record<string, number>
        );

        // 3. First Timers (Members whose first attendance is this event)
        // This is a bit heavier, we need to check if this is their only attendance so far or the earliest one
        // Optimization: We can do a count of attendances for each member present
        const memberIds = event.attendances.map((a) => a.memberId);

        // Find members who have attended events BEFORE this one
        const previousAttendances = await prisma.attendance.findMany({
            where: {
                memberId: { in: memberIds },
                event: {
                    date: { lt: event.date }, // Events strictly before this one
                },
            },
            select: { memberId: true },
            distinct: ['memberId'],
        });

        const returningMemberIds = new Set(previousAttendances.map((a) => a.memberId));
        const firstTimersCount = memberIds.filter((id) => !returningMemberIds.has(id)).length;

        // 4. Guest Analysis
        const guestDetails = event.guestAttendances.map(g => ({
            name: g.guestName,
            purpose: g.purpose,
        }));

        // 5. Region Breakdown
        const regionBreakdown = event.attendances.reduce(
            (acc, curr) => {
                const regionName = curr.member.region.name;
                acc[regionName] = (acc[regionName] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        res.json({
            event: {
                id: event.id,
                name: event.name,
                date: event.date,
                type: event.type,
                status: getEventStatus(event),
            },
            stats: {
                totalAttendance,
                memberCount,
                guestCount,
                genderBreakdown,
                regionBreakdown,
                firstTimersCount,
            },
            guests: guestDetails,
        });
    } catch (error) {
        console.error('Get event report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

export const getComparativeReport = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const currentEvent = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                _count: {
                    select: { attendances: true, guestAttendances: true },
                },
            },
        });

        if (!currentEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Find previous event of same type
        const previousEvent = await prisma.event.findFirst({
            where: {
                type: currentEvent.type,
                date: { lt: currentEvent.date },
            },
            orderBy: { date: 'desc' },
            include: {
                _count: {
                    select: { attendances: true, guestAttendances: true },
                },
            },
        });

        const currentTotal = (currentEvent._count?.attendances || 0) + (currentEvent._count?.guestAttendances || 0);

        let comparison = null;

        if (previousEvent) {
            const prevTotal = (previousEvent._count?.attendances || 0) + (previousEvent._count?.guestAttendances || 0);
            const difference = currentTotal - prevTotal;
            const percentageChange = prevTotal === 0 ? 100 : ((difference / prevTotal) * 100).toFixed(1);

            comparison = {
                previousEvent: {
                    id: previousEvent.id,
                    name: previousEvent.name,
                    date: previousEvent.date,
                    totalAttendance: prevTotal,
                },
                difference,
                percentageChange: Number(percentageChange),
            };
        }

        res.json({
            currentEvent: {
                id: currentEvent.id,
                name: currentEvent.name,
                date: currentEvent.date,
                totalAttendance: currentTotal,
            },
            comparison,
        });

    } catch (error) {
        console.error('Comparative report error:', error);
        res.status(500).json({ error: 'Failed to generate comparative report' });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const cacheKey = 'dashboard_stats';
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json(cachedData);
        }

        // Get total members
        const totalMembers = await prisma.member.count();

        // Get total events
        const totalEvents = await prisma.event.count();

        // Get average attendance (last 5 events)
        const recentEvents = await prisma.event.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: {
                _count: {
                    select: { attendances: true, guestAttendances: true },
                },
            },
        });

        const totalRecentAttendance = recentEvents.reduce((acc, event) => {
            return acc + (event._count?.attendances || 0) + (event._count?.guestAttendances || 0);
        }, 0);

        const averageAttendance = recentEvents.length > 0
            ? Math.round(totalRecentAttendance / recentEvents.length)
            : 0;

        const responseData = {
            totalMembers,
            totalEvents,
            averageAttendance,
        };

        cache.set(cacheKey, responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

export const getCustomReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, type, regionId } = req.query;

        const where: any = {};

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        if (type) {
            where.type = type;
        }

        // If regionId is provided, we need to filter attendances
        // Note: We still fetch the events, but we'll filter the attendance counts
        const events = await prisma.event.findMany({
            where,
            orderBy: { date: 'asc' },
            include: {
                attendances: {
                    where: regionId ? {
                        member: {
                            regionId: regionId as string
                        }
                    } : undefined,
                    include: {
                        member: {
                            include: {
                                region: true
                            }
                        }
                    },
                },
                guestAttendances: true, // Guests don't have regions, so we include them or exclude them? 
                // Requirement says "organise data or be queried by region". 
                // If querying by region, we should probably exclude guests or count them separately.
                // For now, let's include guests but maybe the frontend can decide how to display.
                // OR: if regionId is present, maybe we shouldn't count guests as they don't belong to a region?
                // Let's keep guests for now but note they are not in the region.
            },
        });

        // Aggregated Stats
        const totalEvents = events.length;

        const totalAttendance = events.reduce((acc, event) => {
            // If filtering by region, do we include guests? 
            // Guests don't have regions. So if I want to see "How many people from Central region attended", 
            // I probably don't want guests.
            // But if I want "Total attendance for events filtered by region context", maybe?
            // Let's exclude guests if regionId is provided, to be precise.
            const memberCount = event.attendances.length;
            const guestCount = regionId ? 0 : event.guestAttendances.length;
            return acc + memberCount + guestCount;
        }, 0);

        const averageAttendance = totalEvents > 0 ? Math.round(totalAttendance / totalEvents) : 0;

        // Unique Members
        const allMemberIds = new Set<string>();
        events.forEach(event => {
            event.attendances.forEach(a => allMemberIds.add(a.memberId));
        });
        const uniqueMembers = allMemberIds.size;

        // Gender Distribution (Aggregated)
        const genderBreakdown = { MALE: 0, FEMALE: 0 };

        // Region Distribution (Aggregated)
        const regionBreakdown: Record<string, number> = {};

        events.forEach(event => {
            event.attendances.forEach(a => {
                // Gender
                const gender = a.member.gender as 'MALE' | 'FEMALE';
                if (genderBreakdown[gender] !== undefined) {
                    genderBreakdown[gender]++;
                }

                // Region
                const regionName = a.member.region.name;
                regionBreakdown[regionName] = (regionBreakdown[regionName] || 0) + 1;
            });
        });

        // Chart Data (Attendance over time)
        const chartData = events.map(event => ({
            date: event.date.toISOString().split('T')[0],
            name: event.name,
            attendance: event.attendances.length + (regionId ? 0 : event.guestAttendances.length),
        }));

        res.json({
            stats: {
                totalEvents,
                totalAttendance,
                averageAttendance,
                uniqueMembers,
                genderBreakdown,
                regionBreakdown,
            },
            chartData,
        });

    } catch (error) {
        console.error('Custom report error:', error);
        res.status(500).json({ error: 'Failed to generate custom report' });
    }
};
