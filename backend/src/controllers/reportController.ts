import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { getEventStatus } from '../utils/timezone';
import NodeCache from 'node-cache';
import {
    generateEventReportPDF,
    generateEventReportExcel,
    generateCustomReportPDF,
    generateCustomReportExcel,
} from '../services/reportExportService';
import { getUserReportScope, buildMemberScopeFilter, getScopeDisplayName } from '../utils/reportScopeHelper';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL


// ── Shared Aggregation Helper ────────────────────────────────────────────────

export const aggregateAttendanceStats = async (attendances: any[], guestAttendances: any[], salvations: any[], eventDate: Date) => {
    // 1. Total Attendance
    const memberCount = attendances.length;
    const guestCount = guestAttendances?.length || 0;
    const totalAttendance = memberCount + guestCount;

    // 2. Gender Breakdown
    const genderBreakdown = attendances.reduce(
        (acc: { MALE: number; FEMALE: number }, curr: any) => {
            const gender = curr.member?.gender as 'MALE' | 'FEMALE';
            if (gender === 'MALE' || gender === 'FEMALE') {
                acc[gender] = (acc[gender] || 0) + 1;
            }
            return acc;
        },
        { MALE: 0, FEMALE: 0 }
    );

    // 3. First Timers (Tag-Based with Fallback)
    const memberIds = attendances.map((a: any) => a.memberId);

    // Priority 1: Check for PENDING_FIRST_ATTENDANCE tag
    const firstTimerTagCount = await prisma.memberTag.count({
        where: {
            memberId: { in: memberIds },
            tag: { name: 'PENDING_FIRST_ATTENDANCE' },
            isActive: true,
        },
    });

    let firstTimersCount = firstTimerTagCount;

    // Priority 2: Fallback to attendance history if no tags found
    if (firstTimersCount === 0 && memberIds.length > 0) {
        const previousAttendances = await prisma.attendance.findMany({
            where: {
                memberId: { in: memberIds },
                event: {
                    date: { lt: eventDate },
                },
            },
            select: { memberId: true },
            distinct: ['memberId'],
        });

        const returningMemberIds = new Set(previousAttendances.map((a: any) => a.memberId));
        firstTimersCount = memberIds.filter((id: string) => !returningMemberIds.has(id)).length;
    }

    // 5. Region Breakdown
    const regionBreakdown = attendances.reduce(
        (acc: Record<string, number>, curr: any) => {
            const regionName = curr.member?.region?.name;
            if (regionName) acc[regionName] = (acc[regionName] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    // 6. Salvation Breakdown
    const salvationBreakdown = (salvations || []).reduce(
        (acc: Record<string, number>, curr: any) => {
            if (curr.decisionType) acc[curr.decisionType] = (acc[curr.decisionType] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    // 7. Tag Distribution
    const tagDistribution = attendances.reduce(
        (acc: Record<string, number>, curr: any) => {
            curr.member?.memberTags?.forEach((mt: any) => {
                const tagName = mt.tag?.name;
                if (tagName) acc[tagName] = (acc[tagName] || 0) + 1;
            });
            return acc;
        },
        {} as Record<string, number>
    );

    // 8. Year of Study Breakdown
    const yearOfStudyBreakdown: Record<string, number> = {
        'Year 1': 0,
        'Year 2': 0,
        'Year 3': 0,
        'Year 4': 0,
        'Year 5+': 0,
        'Unknown': 0
    };

    attendances.forEach((att: any) => {
        const year = att.member?.initialYearOfStudy;
        if (!year) {
            yearOfStudyBreakdown['Unknown']++;
        } else if (year <= 4) {
            yearOfStudyBreakdown[`Year ${year}`]++;
        } else {
            yearOfStudyBreakdown['Year 5+']++;
        }
    });

    // 9. College Distribution
    const collegeBreakdown = attendances.reduce(
        (acc: Record<string, number>, curr: any) => {
            const college = curr.member?.courseRelation?.college?.name || 'Unknown';
            acc[college] = (acc[college] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    // 10. Course Distribution
    const courseBreakdown = attendances.reduce(
        (acc: Record<string, number>, curr: any) => {
            const course = curr.member?.courseRelation?.name || 'Unknown';
            acc[course] = (acc[course] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    // 11. Family Participation
    const familyBreakdown = attendances.reduce(
        (acc: Record<string, number>, curr: any) => {
            const families = (curr.member?.familyMemberships || []).filter((fm: any) => fm.isActive);
            if (families.length === 0) {
                acc['No Family'] = (acc['No Family'] || 0) + 1;
            } else {
                families.forEach((fm: any) => {
                    const familyName = fm.family?.name;
                    if (familyName) acc[familyName] = (acc[familyName] || 0) + 1;
                });
            }
            return acc;
        },
        {} as Record<string, number>
    );

    // 12. Ministry Team Participation
    const teamBreakdown = attendances.reduce(
        (acc: Record<string, number>, curr: any) => {
            const teams = (curr.member?.ministryMemberships || []).filter((mm: any) => mm.isActive);
            if (teams.length === 0) {
                acc['No Team'] = (acc['No Team'] || 0) + 1;
            } else {
                teams.forEach((mm: any) => {
                    const teamName = mm.team?.name;
                    if (teamName) acc[teamName] = (acc[teamName] || 0) + 1;
                });
            }
            return acc;
        },
        {} as Record<string, number>
    );

    // 13. Special Tags (Finalist, Alumni, Volunteers)
    const specialTagStats = attendances.reduce(
        (acc: { finalists: number, alumni: number, volunteers: number }, curr: any) => {
            const tagNames = (curr.member?.memberTags || []).map((mt: any) => mt.tag?.name);
            if (tagNames.includes('FINALIST')) acc.finalists++;
            if (tagNames.includes('ALUMNI')) acc.alumni++;
            if (tagNames.includes('CHECK_IN_VOLUNTEER')) acc.volunteers++;
            return acc;
        },
        { finalists: 0, alumni: 0, volunteers: 0 }
    );

    // 14. Member Type Breakdown (Makerere / Non-Makerere / Alumni)
    const memberTypeBreakdown = attendances.reduce(
        (acc: Record<string, number>, curr: any) => {
            const tagNames = (curr.member?.memberTags || []).map((mt: any) => mt.tag?.name);
            const isMakerere = !!curr.member?.courseId; // enrolled in a tracked course
            const isAlumni = tagNames.includes('ALUMNI');
            if (isAlumni) {
                acc['Alumni'] = (acc['Alumni'] || 0) + 1;
            } else if (isMakerere) {
                acc['Makerere Students'] = (acc['Makerere Students'] || 0) + 1;
            } else {
                acc['Non-Makerere / Other'] = (acc['Non-Makerere / Other'] || 0) + 1;
            }
            return acc;
        },
        {} as Record<string, number>
    );

    return {
        totalAttendance,
        memberCount,
        guestCount,
        genderBreakdown,
        regionBreakdown,
        firstTimersCount,
        salvationBreakdown,
        tagDistribution,
        // Academic Statistics
        yearOfStudyBreakdown,
        collegeBreakdown,
        courseBreakdown,
        // Organizational Statistics
        familyBreakdown,
        teamBreakdown,
        // Special Tags
        specialTagStats,
        // Member Type
        memberTypeBreakdown,
    };
};


// Helper to calculate event status


export const getEventReport = async (req: Request<{ eventId: string }>, res: Response) => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check publication status
        const reportStatus = await prisma.eventReport.findUnique({
            where: { eventId }
        });

        // Fellowship Managers can always see reports (even unpublished)
        if (userRole !== 'FELLOWSHIP_MANAGER') {
            if (!reportStatus || !reportStatus.isPublished) {
                return res.status(403).json({
                    error: 'Report not yet available',
                    message: 'This report has not been published yet. Please contact the Fellowship Manager.'
                });
            }
        }

        // ── Cleanup: deactivate all expired CHECK_IN_VOLUNTEER tags ──────────
        // This ensures the DB stays clean regardless of whether the per-member
        // cleanup in volunteerController has been triggered.
        await prisma.memberTag.updateMany({
            where: {
                isActive: true,
                expiresAt: { lt: new Date() },
                tag: { name: 'CHECK_IN_VOLUNTEER' },
            },
            data: {
                isActive: false,
                removedAt: new Date(),
                removedBy: 'SYSTEM',
                notes: 'Auto-deactivated: tag expired (report load cleanup)',
            },
        });

        // Get user's scope
        const scope = await getUserReportScope(userId);
        const memberFilter = buildMemberScopeFilter(scope);

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                attendances: {
                    where: {
                        member: memberFilter
                    },
                    include: {
                        member: {
                            include: {
                                region: true,
                                courseRelation: {
                                    include: { college: true }
                                },
                                familyMemberships: {
                                    where: { isActive: true },
                                    include: { family: true }
                                },
                                ministryMemberships: {
                                    where: { isActive: true },
                                    include: { team: true }
                                },
                                memberTags: {
                                    where: {
                                        isActive: true,
                                        OR: [
                                            { expiresAt: null },           // No expiry set → always active
                                            { expiresAt: { gt: new Date() } }, // Expiry set but not yet reached
                                        ],
                                    },
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

        const stats = await aggregateAttendanceStats(event.attendances, event.guestAttendances, event.salvations, event.date);

        // Map attendees to a lightweight format for frontend drill-downs (instant zero-latency clicks)
        const mappedAttendees = event.attendances.map((a: any) => ({
            id: a.member.id,
            name: a.member.fullName,
            gender: a.member.gender,
            contactPhone: a.member.contactPhone,
            region: a.member.region?.name,
            college: a.member.courseRelation?.college?.name,
            course: a.member.courseRelation?.name,
            year: a.member.initialYearOfStudy,
            families: a.member.familyMemberships.map((fm: any) => fm.family.name),
            teams: a.member.ministryMemberships.map((mm: any) => mm.team.name),
            tags: a.member.memberTags.map((mt: any) => mt.tag.name),
            isGuest: false,
        }));

        const mappedGuests = event.guestAttendances.map((g: any) => ({
            id: `guest-${g.id}`,
            name: g.guestName,
            purpose: g.purpose,
            isGuest: true,
        }));

        const mappedSalvations = event.salvations.map((s: any) => ({
            id: `salvation-${s.id}`,
            name: s.member?.fullName || s.guestName || 'Unknown',
            gender: s.member?.gender,
            contactPhone: s.member?.contactPhone || s.guestPhone,
            region: s.member?.region?.name || s.guestResidence,
            college: s.member?.courseRelation?.college?.name,
            course: s.member?.courseRelation?.name,
            year: s.member?.initialYearOfStudy,
            families: s.member?.familyMemberships?.map((fm: any) => fm.family.name) || [],
            teams: s.member?.ministryMemberships?.map((mm: any) => mm.team.name) || [],
            tags: s.member?.memberTags?.map((mt: any) => mt.tag.name) || [],
            isGuest: !s.member,
            purpose: s.decisionType,
        }));

        res.json({
            event: {
                id: event.id,
                name: event.name,
                date: event.date,
                type: event.type,
                status: getEventStatus(event),
            },
            stats,
            attendees: [...mappedAttendees, ...mappedGuests],
            salvations: mappedSalvations,
            guests: mappedGuests.map((g: any) => ({ name: g.name, purpose: g.purpose })), // Keep for backward compatibility if needed, though attendees is better
            scope: {
                type: scope.regionId ? 'region' : scope.familyIds.length > 0 ? 'family' : scope.teamIds.length > 0 ? 'team' : 'all',
                name: getScopeDisplayName(scope),
                isFellowshipManager: userRole === 'FELLOWSHIP_MANAGER'
            }
        });
    } catch (error) {
        console.error('Event report error:', error);
        res.status(500).json({ error: 'Failed to generate event report' });
    }
};

export const getComparativeReport = async (req: Request<{ eventId: string }>, res: Response) => {
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
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user's scope  
        const scope = await getUserReportScope(userId);
        const memberFilter = buildMemberScopeFilter(scope);

        const [totalMembers, totalEvents, recentEvents, finalistsCount, alumniCount, activeFamilies, activeTeams] = await Promise.all([
            prisma.member.count({ where: { isDeleted: false, ...memberFilter } }),
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
            prisma.memberTag.count({
                where: {
                    tag: { name: 'FINALIST' },
                    isActive: true,
                    member: memberFilter
                }
            }),
            prisma.memberTag.count({
                where: {
                    tag: { name: 'ALUMNI' },
                    isActive: true,
                    member: memberFilter
                }
            }),
            scope.role === 'FELLOWSHIP_MANAGER' ? prisma.familyGroup.count() : Promise.resolve(scope.familyIds.length),
            scope.role === 'FELLOWSHIP_MANAGER' ? prisma.ministryTeam.count() : Promise.resolve(scope.teamIds.length)
        ]);

        const totalRecentAttendance = recentEvents.reduce((acc: number, event: any) => {
            return acc + (event._count?.attendances || 0) + (event._count?.guestAttendances || 0);
        }, 0);

        const averageAttendance = recentEvents.length > 0
            ? Math.round(totalRecentAttendance / recentEvents.length)
            : 0;

        const responseData = {
            totalMembers,
            totalEvents,
            averageAttendance,
            finalistsCount,
            alumniCount,
            activeFamilies,
            activeTeams,
            scope: {
                type: scope.regionId ? 'region' : scope.familyIds.length > 0 ? 'family' : scope.teamIds.length > 0 ? 'team' : 'all',
                name: getScopeDisplayName(scope)
            }
        };

        res.json(responseData);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

export const getCustomReport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, type } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // ── Cleanup: deactivate all expired CHECK_IN_VOLUNTEER tags ──────────
        await prisma.memberTag.updateMany({
            where: {
                isActive: true,
                expiresAt: { lt: new Date() },
                tag: { name: 'CHECK_IN_VOLUNTEER' },
            },
            data: {
                isActive: false,
                removedAt: new Date(),
                removedBy: 'SYSTEM',
                notes: 'Auto-deactivated: tag expired (report load cleanup)',
            },
        });

        // Get user's scope
        const scope = await getUserReportScope(userId);
        const memberFilter = buildMemberScopeFilter(scope);

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

        // Fetch events with scoped attendances
        const events = await prisma.event.findMany({
            where,
            orderBy: { date: 'asc' },
            include: {
                attendances: {
                    where: {
                        member: memberFilter
                    },
                    include: {
                        member: {
                            include: {
                                region: true,
                                courseRelation: {
                                    include: { college: true }
                                },
                                familyMemberships: {
                                    where: { isActive: true },
                                    include: { family: true }
                                },
                                ministryMemberships: {
                                    where: { isActive: true },
                                    include: { team: true }
                                },
                                memberTags: {
                                    where: {
                                        isActive: true,
                                        OR: [
                                            { expiresAt: null },
                                            { expiresAt: { gt: new Date() } },
                                        ],
                                    },
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

        // We can reuse aggregateAttendanceStats by flattening all events' attendances
        const allAttendances = events.flatMap((e: any) => e.attendances);
        const allGuestAttendances = events.flatMap((e: any) => e.guestAttendances);
        const allSalvations = events.flatMap((e: any) => e.salvations);

        // Use the oldest event's date for first-timer historical fallback if needed
        const oldestDate = events.length > 0 ? events[0].date : new Date();
        const baseStats = await aggregateAttendanceStats(allAttendances, allGuestAttendances, allSalvations, oldestDate);

        // Add custom report specific stats
        const totalEvents = events.length;
        const averageAttendance = totalEvents > 0 ? Math.round(baseStats.totalAttendance / totalEvents) : 0;

        const allMemberIds = new Set<string>();
        allAttendances.forEach((a: any) => allMemberIds.add(a.memberId));
        const uniqueMembers = allMemberIds.size;

        // Chart Data (Attendance over time)
        const chartData = events.map((event: any) => ({
            date: event.date.toISOString().split('T')[0],
            name: event.name,
            attendance: event.attendances.length + event.guestAttendances.length,
        }));

        res.json({
            stats: {
                totalEvents,
                uniqueMembers,
                averageAttendance,
                ...baseStats,
            },
            chartData,
            scope: {
                type: scope.regionId ? 'region' : scope.familyIds.length > 0 ? 'family' : scope.teamIds.length > 0 ? 'team' : 'all',
                name: getScopeDisplayName(scope)
            }
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
export const exportEventReportPDF = async (req: Request<{ eventId: string }>, res: Response) => {
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
                                courseRelation: {
                                    include: { college: true }
                                },
                                familyMemberships: {
                                    where: { isActive: true },
                                    include: { family: true }
                                },
                                ministryMemberships: {
                                    where: { isActive: true },
                                    include: { team: true }
                                },
                                memberTags: {
                                    where: {
                                        isActive: true,
                                        OR: [
                                            { expiresAt: null },
                                            { expiresAt: { gt: new Date() } },
                                        ],
                                    },
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

        const stats = await aggregateAttendanceStats(event.attendances, event.guestAttendances, event.salvations, event.date);

        const guestDetails = event.guestAttendances.map((g: any) => ({
            name: g.guestName,
            purpose: g.purpose,
        }));

        const reportData = {
            event: {
                id: event.id,
                name: event.name,
                date: event.date,
                type: event.type,
                status: getEventStatus(event),
            },
            stats,
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
export const exportEventReportExcel = async (req: Request<{ eventId: string }>, res: Response) => {
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
                                courseRelation: {
                                    include: { college: true }
                                },
                                familyMemberships: {
                                    where: { isActive: true },
                                    include: { family: true }
                                },
                                ministryMemberships: {
                                    where: { isActive: true },
                                    include: { team: true }
                                },
                                memberTags: {
                                    where: {
                                        isActive: true,
                                        OR: [
                                            { expiresAt: null },
                                            { expiresAt: { gt: new Date() } },
                                        ],
                                    },
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

        const stats = await aggregateAttendanceStats(event.attendances, event.guestAttendances, event.salvations, event.date);

        const mappedAttendees = event.attendances.map((a: any) => ({
            name: a.member.fullName,
            gender: a.member.gender,
            contactPhone: a.member.contactPhone,
            region: a.member.region?.name,
            college: a.member.courseRelation?.college?.name,
            course: a.member.courseRelation?.name,
            year: a.member.initialYearOfStudy,
            families: a.member.familyMemberships.map((fm: any) => fm.family.name),
            teams: a.member.ministryMemberships.map((mm: any) => mm.team.name),
            tags: a.member.memberTags.map((mt: any) => mt.tag.name),
            isGuest: false,
        }));

        const mappedGuests = event.guestAttendances.map((g: any) => ({
            name: g.guestName,
            purpose: g.purpose,
            isGuest: true,
        }));

        const guestDetails = mappedGuests.map((g: any) => ({
            name: g.name,
            purpose: g.purpose,
        }));

        const reportData = {
            event: {
                id: event.id,
                name: event.name,
                date: event.date,
                type: event.type,
                status: getEventStatus(event),
            },
            stats,
            guests: guestDetails,
            attendees: [...mappedAttendees, ...mappedGuests]
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
        const totalAttendance = events.reduce((acc: number, event: any) => {
            const memberCount = event.attendances.length;
            const guestCount = regionId ? 0 : event.guestAttendances.length;
            return acc + memberCount + guestCount;
        }, 0);

        const averageAttendance = totalEvents > 0 ? Math.round(totalAttendance / totalEvents) : 0;

        const allMemberIds = new Set<string>();
        events.forEach((event: any) => {
            event.attendances.forEach((a: any) => allMemberIds.add(a.memberId));
        });
        const uniqueMembers = allMemberIds.size;

        const genderBreakdown = { MALE: 0, FEMALE: 0 };
        const regionBreakdown: Record<string, number> = {};
        const tagDistribution: Record<string, number> = {};
        const salvationBreakdown: Record<string, number> = {};

        events.forEach((event: any) => {
            event.attendances.forEach((a: any) => {
                const gender = a.member.gender as 'MALE' | 'FEMALE';
                if (genderBreakdown[gender] !== undefined) {
                    genderBreakdown[gender]++;
                }
                const regionName = a.member.region.name;
                regionBreakdown[regionName] = (regionBreakdown[regionName] || 0) + 1;

                a.member.memberTags.forEach((mt: any) => {
                    const tagName = mt.tag.name;
                    tagDistribution[tagName] = (tagDistribution[tagName] || 0) + 1;
                });
            });

            event.salvations.forEach((s: any) => {
                salvationBreakdown[s.decisionType] = (salvationBreakdown[s.decisionType] || 0) + 1;
            });
        });

        const chartData = events.map((event: any) => ({
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
        const totalAttendance = events.reduce((acc: number, event: any) => {
            const memberCount = event.attendances.length;
            const guestCount = regionId ? 0 : event.guestAttendances.length;
            return acc + memberCount + guestCount;
        }, 0);

        const averageAttendance = totalEvents > 0 ? Math.round(totalAttendance / totalEvents) : 0;

        const allMemberIds = new Set<string>();
        events.forEach((event: any) => {
            event.attendances.forEach((a: any) => allMemberIds.add(a.memberId));
        });
        const uniqueMembers = allMemberIds.size;

        const genderBreakdown = { MALE: 0, FEMALE: 0 };
        const regionBreakdown: Record<string, number> = {};
        const tagDistribution: Record<string, number> = {};
        const salvationBreakdown: Record<string, number> = {};

        events.forEach((event: any) => {
            event.attendances.forEach((a: any) => {
                const gender = a.member.gender as 'MALE' | 'FEMALE';
                if (genderBreakdown[gender] !== undefined) {
                    genderBreakdown[gender]++;
                }
                const regionName = a.member.region.name;
                regionBreakdown[regionName] = (regionBreakdown[regionName] || 0) + 1;

                a.member.memberTags.forEach((mt: any) => {
                    const tagName = mt.tag.name;
                    tagDistribution[tagName] = (tagDistribution[tagName] || 0) + 1;
                });
            });

            event.salvations.forEach((s: any) => {
                salvationBreakdown[s.decisionType] = (salvationBreakdown[s.decisionType] || 0) + 1;
            });
        });

        const chartData = events.map((event: any) => ({
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

// ============================================================================
// EVENT REPORT PUBLICATION CONTROL
// ============================================================================

// Publish event report (Fellowship Managers only)
export const publishEventReport = async (req: Request<{ eventId: string }>, res: Response) => {
    try {
        const { eventId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify event exists
        const event = await prisma.event.findUnique({
            where: { id: eventId }
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Publish report (create or update)
        const report = await prisma.eventReport.upsert({
            where: { eventId },
            create: {
                eventId,
                isPublished: true,
                publishedAt: new Date(),
                publishedBy: userId
            },
            update: {
                isPublished: true,
                publishedAt: new Date(),
                publishedBy: userId
            },
            include: {
                publisher: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        });

        res.json({
            message: 'Report published successfully',
            report
        });
    } catch (error) {
        console.error('Error publishing report:', error);
        res.status(500).json({ error: 'Failed to publish report' });
    }
};

// Unpublish event report (Fellowship Managers only)
export const unpublishEventReport = async (req: Request<{ eventId: string }>, res: Response) => {
    try {
        const { eventId } = req.params;

        const report = await prisma.eventReport.update({
            where: { eventId },
            data: {
                isPublished: false,
                publishedAt: null,
                publishedBy: null
            }
        });

        res.json({
            message: 'Report unpublished successfully',
            report
        });
    } catch (error) {
        console.error('Error unpublishing report:', error);
        res.status(500).json({ error: 'Failed to unpublish report' });
    }
};

//Get event report publication status
export const getReportStatus = async (req: Request<{ eventId: string }>, res: Response) => {
    try {
        const { eventId } = req.params;

        const report = await prisma.eventReport.findUnique({
            where: { eventId },
            include: {
                publisher: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        });

        res.json({
            isPublished: report?.isPublished || false,
            publishedAt: report?.publishedAt || null,
            publisher: report?.publisher || null
        });
    } catch (error) {
        console.error('Error fetching report status:', error);
        res.status(500).json({ error: 'Failed to fetch report status' });
    }
};

// Get all published event reports (for leaders — read-only list)
export const getPublishedReports = async (req: Request, res: Response) => {
    try {
        const reports = await prisma.eventReport.findMany({
            where: { isPublished: true },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        date: true,
                        type: true,
                        venue: true,
                    },
                },
                publisher: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { publishedAt: 'desc' },
        });

        res.json(reports);
    } catch (error) {
        console.error('Error fetching published reports:', error);
        res.status(500).json({ error: 'Failed to fetch published reports' });
    }
};
