import { Request, Response } from 'express';
import prisma from '../prisma';
import NodeCache from 'node-cache';
import {
    generateEventReportPDF,
    generateEventReportExcel,
    generateCustomReportPDF,
    generateCustomReportExcel,
} from '../services/reportExportService';

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
                                region: true,
                                memberTags: {
                                    where: { isActive: true },
                                    include: { tag: true }
                                }
                            }
                        },
                    },
                },
                guestAttendances: true,
                salvations: true,
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

        // 3. First Timers
        const memberIds = event.attendances.map((a) => a.memberId);
        const previousAttendances = await prisma.attendance.findMany({
            where: {
                memberId: { in: memberIds },
                event: {
                    date: { lt: event.date },
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

        // 6. Salvation Breakdown
        const salvationBreakdown = event.salvations.reduce(
            (acc, curr) => {
                acc[curr.decisionType] = (acc[curr.decisionType] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        // 7. Tag Distribution
        const tagDistribution = event.attendances.reduce(
            (acc, curr) => {
                curr.member.memberTags.forEach(mt => {
                    const tagName = mt.tag.name;
                    acc[tagName] = (acc[tagName] || 0) + 1;
                });
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
                salvationBreakdown,
                tagDistribution,
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

        const events = await prisma.event.findMany({
            where: {
                type: currentEvent.type,
                date: { lt: currentEvent.date },
            },
            orderBy: { date: 'desc' },
            take: 4,
            include: {
                _count: {
                    select: { attendances: true, guestAttendances: true },
                },
            },
        });

        const allEvents = [currentEvent, ...events].reverse(); // Oldest to newest

        const labels = allEvents.map((e) => new Date(e.date).toLocaleDateString());
        const data = allEvents.map((e) => (e._count.attendances || 0) + (e._count.guestAttendances || 0));

        res.json({ labels, data });
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

        const [totalMembers, totalEvents, recentEvents] = await Promise.all([
            prisma.member.count(),
            prisma.event.count(),
            prisma.event.findMany({
                take: 5,
                orderBy: { date: 'desc' },
                include: {
                    _count: {
                        select: { attendances: true, guestAttendances: true },
                    },
                },
            }),
        ]);

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
                                region: true,
                                memberTags: {
                                    where: { isActive: true },
                                    include: { tag: true }
                                }
                            }
                        }
                    },
                },
                guestAttendances: true,
                salvations: true,
            },
        });

        // Aggregated Stats
        const totalEvents = events.length;

        const totalAttendance = events.reduce((acc, event) => {
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

        // Region & Tag & Salvation Distribution (Aggregated)
        const regionBreakdown: Record<string, number> = {};
        const tagDistribution: Record<string, number> = {};
        const salvationBreakdown: Record<string, number> = {};

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

                // Tags
                a.member.memberTags.forEach(mt => {
                    const tagName = mt.tag.name;
                    tagDistribution[tagName] = (tagDistribution[tagName] || 0) + 1;
                });
            });

            // Salvations
            event.salvations.forEach(s => {
                salvationBreakdown[s.decisionType] = (salvationBreakdown[s.decisionType] || 0) + 1;
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
                tagDistribution,
                salvationBreakdown,
            },
            chartData,
        });

    } catch (error) {
        console.error('Custom report error:', error);
        res.status(500).json({ error: 'Failed to generate custom report' });
    }
};

/**
 * Export Event Report as PDF
 * GET /reports/:eventId/export/pdf
 */
export const exportEventReportPDF = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                attendances: {
                    include: {
                        member: {
                            include: {
                                region: true,
                                memberTags: {
                                    where: { isActive: true },
                                    include: { tag: true }
                                }
                            }
                        },
                    },
                },
                guestAttendances: true,
                salvations: true,
            },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const memberCount = event.attendances.length;
        const guestCount = event.guestAttendances.length;
        const totalAttendance = memberCount + guestCount;

        const genderBreakdown: { MALE: number; FEMALE: number } = event.attendances.reduce(
            (acc, curr) => {
                const gender = curr.member.gender;
                if (gender === 'MALE' || gender === 'FEMALE') {
                    acc[gender] = (acc[gender] || 0) + 1;
                }
                return acc;
            },
            { MALE: 0, FEMALE: 0 }
        );

        const memberIds = event.attendances.map((a) => a.memberId);
        const previousAttendances = await prisma.attendance.findMany({
            where: {
                memberId: { in: memberIds },
                event: {
                    date: { lt: event.date },
                },
            },
            select: { memberId: true },
            distinct: ['memberId'],
        });

        const returningMemberIds = new Set(previousAttendances.map((a) => a.memberId));
        const firstTimersCount = memberIds.filter((id) => !returningMemberIds.has(id)).length;

        const guestDetails = event.guestAttendances.map(g => ({
            name: g.guestName,
            purpose: g.purpose,
        }));

        const regionBreakdown = event.attendances.reduce(
            (acc, curr) => {
                const regionName = curr.member.region.name;
                acc[regionName] = (acc[regionName] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const salvationBreakdown = event.salvations.reduce(
            (acc, curr) => {
                acc[curr.decisionType] = (acc[curr.decisionType] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const tagDistribution = event.attendances.reduce(
            (acc, curr) => {
                curr.member.memberTags.forEach(mt => {
                    const tagName = mt.tag.name;
                    acc[tagName] = (acc[tagName] || 0) + 1;
                });
                return acc;
            },
            {} as Record<string, number>
        );

        const reportData = {
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
                salvationBreakdown,
                tagDistribution,
            },
            guests: guestDetails,
        };

        await generateEventReportPDF(reportData, res);
    } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};

/**
 * Export Event Report as Excel
 * GET /reports/:eventId/export/excel
 */
export const exportEventReportExcel = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                attendances: {
                    include: {
                        member: {
                            include: {
                                region: true,
                                memberTags: {
                                    where: { isActive: true },
                                    include: { tag: true }
                                }
                            }
                        },
                    },
                },
                guestAttendances: true,
                salvations: true,
            },
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const memberCount = event.attendances.length;
        const guestCount = event.guestAttendances.length;
        const totalAttendance = memberCount + guestCount;

        const genderBreakdown: { MALE: number; FEMALE: number } = event.attendances.reduce(
            (acc, curr) => {
                const gender = curr.member.gender;
                if (gender === 'MALE' || gender === 'FEMALE') {
                    acc[gender] = (acc[gender] || 0) + 1;
                }
                return acc;
            },
            { MALE: 0, FEMALE: 0 }
        );

        const memberIds = event.attendances.map((a) => a.memberId);
        const previousAttendances = await prisma.attendance.findMany({
            where: {
                memberId: { in: memberIds },
                event: {
                    date: { lt: event.date },
                },
            },
            select: { memberId: true },
            distinct: ['memberId'],
        });

        const returningMemberIds = new Set(previousAttendances.map((a) => a.memberId));
        const firstTimersCount = memberIds.filter((id) => !returningMemberIds.has(id)).length;

        const guestDetails = event.guestAttendances.map(g => ({
            name: g.guestName,
            purpose: g.purpose,
        }));

        const regionBreakdown = event.attendances.reduce(
            (acc, curr) => {
                const regionName = curr.member.region.name;
                acc[regionName] = (acc[regionName] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const salvationBreakdown = event.salvations.reduce(
            (acc, curr) => {
                acc[curr.decisionType] = (acc[curr.decisionType] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const tagDistribution = event.attendances.reduce(
            (acc, curr) => {
                curr.member.memberTags.forEach(mt => {
                    const tagName = mt.tag.name;
                    acc[tagName] = (acc[tagName] || 0) + 1;
                });
                return acc;
            },
            {} as Record<string, number>
        );

        const reportData = {
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
                salvationBreakdown,
                tagDistribution,
            },
            guests: guestDetails,
        };

        await generateEventReportExcel(reportData, res);
    } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({ error: 'Failed to generate Excel' });
    }
};

/**
 * Export Custom Report as PDF
 * GET /reports/custom/export/pdf
 */
export const exportCustomReportPDF = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, type, regionId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

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
                                region: true,
                                memberTags: {
                                    where: { isActive: true },
                                    include: { tag: true }
                                }
                            }
                        }
                    },
                },
                guestAttendances: true,
                salvations: true,
            },
        });

        const totalEvents = events.length;
        const totalAttendance = events.reduce((acc, event) => {
            const memberCount = event.attendances.length;
            const guestCount = regionId ? 0 : event.guestAttendances.length;
            return acc + memberCount + guestCount;
        }, 0);

        const averageAttendance = totalEvents > 0 ? Math.round(totalAttendance / totalEvents) : 0;

        const allMemberIds = new Set<string>();
        events.forEach(event => {
            event.attendances.forEach(a => allMemberIds.add(a.memberId));
        });
        const uniqueMembers = allMemberIds.size;

        const genderBreakdown = { MALE: 0, FEMALE: 0 };
        const regionBreakdown: Record<string, number> = {};
        const tagDistribution: Record<string, number> = {};
        const salvationBreakdown: Record<string, number> = {};

        events.forEach(event => {
            event.attendances.forEach(a => {
                const gender = a.member.gender as 'MALE' | 'FEMALE';
                if (genderBreakdown[gender] !== undefined) {
                    genderBreakdown[gender]++;
                }
                const regionName = a.member.region.name;
                regionBreakdown[regionName] = (regionBreakdown[regionName] || 0) + 1;

                a.member.memberTags.forEach(mt => {
                    const tagName = mt.tag.name;
                    tagDistribution[tagName] = (tagDistribution[tagName] || 0) + 1;
                });
            });

            event.salvations.forEach(s => {
                salvationBreakdown[s.decisionType] = (salvationBreakdown[s.decisionType] || 0) + 1;
            });
        });

        const chartData = events.map(event => ({
            date: event.date.toISOString().split('T')[0],
            name: event.name,
            attendance: event.attendances.length + (regionId ? 0 : event.guestAttendances.length),
        }));

        const reportData = {
            stats: {
                totalEvents,
                totalAttendance,
                averageAttendance,
                uniqueMembers,
                genderBreakdown,
                regionBreakdown,
                tagDistribution,
                salvationBreakdown,
            },
            chartData,
        };

        await generateCustomReportPDF(reportData, {
            startDate: startDate as string,
            endDate: endDate as string,
        }, res);
    } catch (error) {
        console.error('Custom PDF export error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};

/**
 * Export Custom Report as Excel
 * GET /reports/custom/export/excel
 */
export const exportCustomReportExcel = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, type, regionId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

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
                                region: true,
                                memberTags: {
                                    where: { isActive: true },
                                    include: { tag: true }
                                }
                            }
                        }
                    },
                },
                guestAttendances: true,
                salvations: true,
            },
        });

        const totalEvents = events.length;
        const totalAttendance = events.reduce((acc, event) => {
            const memberCount = event.attendances.length;
            const guestCount = regionId ? 0 : event.guestAttendances.length;
            return acc + memberCount + guestCount;
        }, 0);

        const averageAttendance = totalEvents > 0 ? Math.round(totalAttendance / totalEvents) : 0;

        const allMemberIds = new Set<string>();
        events.forEach(event => {
            event.attendances.forEach(a => allMemberIds.add(a.memberId));
        });
        const uniqueMembers = allMemberIds.size;

        const genderBreakdown = { MALE: 0, FEMALE: 0 };
        const regionBreakdown: Record<string, number> = {};
        const tagDistribution: Record<string, number> = {};
        const salvationBreakdown: Record<string, number> = {};

        events.forEach(event => {
            event.attendances.forEach(a => {
                const gender = a.member.gender as 'MALE' | 'FEMALE';
                if (genderBreakdown[gender] !== undefined) {
                    genderBreakdown[gender]++;
                }
                const regionName = a.member.region.name;
                regionBreakdown[regionName] = (regionBreakdown[regionName] || 0) + 1;

                a.member.memberTags.forEach(mt => {
                    const tagName = mt.tag.name;
                    tagDistribution[tagName] = (tagDistribution[tagName] || 0) + 1;
                });
            });

            event.salvations.forEach(s => {
                salvationBreakdown[s.decisionType] = (salvationBreakdown[s.decisionType] || 0) + 1;
            });
        });

        const chartData = events.map(event => ({
            date: event.date.toISOString().split('T')[0],
            name: event.name,
            attendance: event.attendances.length + (regionId ? 0 : event.guestAttendances.length),
        }));

        const reportData = {
            stats: {
                totalEvents,
                totalAttendance,
                averageAttendance,
                uniqueMembers,
                genderBreakdown,
                regionBreakdown,
                tagDistribution,
                salvationBreakdown,
            },
            chartData,
        };

        await generateCustomReportExcel(reportData, {
            startDate: startDate as string,
            endDate: endDate as string,
        }, res);
    } catch (error) {
        console.error('Custom Excel export error:', error);
        res.status(500).json({ error: 'Failed to generate Excel' });
    }
};
