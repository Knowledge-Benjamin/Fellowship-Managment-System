import prisma from '../prisma';

/**
 * Get currently active academic period
 */
export async function getCurrentPeriod() {
    const now = new Date();

    return await prisma.academicPeriod.findFirst({
        where: {
            startDate: { lte: now },
            endDate: { gte: now },
        },
        orderBy: { startDate: 'desc' },
    });
}

/**
 * Count completed academic periods since a given date
 */
export async function getElapsedPeriods(registrationDate: Date): Promise<number> {
    const now = new Date();

    const completedPeriods = await prisma.academicPeriod.count({
        where: {
            startDate: { gte: registrationDate },
            endDate: { lte: now },
        },
    });

    return completedPeriods;
}

/**
 * Calculate member's current year and semester based on elapsed periods
 */
export async function getCurrentAcademicStatus(member: {
    registrationDate: Date;
    initialYearOfStudy: number;
    initialSemester: number;
}): Promise<{ currentYear: number; currentSemester: number }> {
    const periodsElapsed = await getElapsedPeriods(member.registrationDate);

    // Calculate total semesters: starting position + elapsed periods
    const totalSemesters =
        (member.initialYearOfStudy - 1) * 2 +
        member.initialSemester +
        periodsElapsed;

    const currentYear = Math.ceil(totalSemesters / 2);
    const currentSemester = totalSemesters % 2 === 0 ? 2 : 1;

    return { currentYear, currentSemester };
}

/**
 * Check if member is currently a finalist
 */
export async function isMemberFinalist(member: {
    registrationDate: Date | null;
    initialYearOfStudy: number | null;
    initialSemester: number | null;
    courseRelation: { durationYears: number } | null;
}): Promise<boolean> {
    if (
        !member.courseRelation ||
        !member.registrationDate ||
        !member.initialYearOfStudy ||
        !member.initialSemester
    ) {
        return false;
    }

    const { currentYear } = await getCurrentAcademicStatus({
        registrationDate: member.registrationDate,
        initialYearOfStudy: member.initialYearOfStudy,
        initialSemester: member.initialSemester,
    });

    return currentYear === member.courseRelation.durationYears;
}

/**
 * Check if member is an alumni
 */
export async function isMemberAlumni(member: {
    registrationDate: Date | null;
    initialYearOfStudy: number | null;
    initialSemester: number | null;
    courseRelation: { durationYears: number } | null;
}): Promise<boolean> {
    if (
        !member.courseRelation ||
        !member.registrationDate ||
        !member.initialYearOfStudy ||
        !member.initialSemester
    ) {
        return false;
    }

    const { currentYear } = await getCurrentAcademicStatus({
        registrationDate: member.registrationDate,
        initialYearOfStudy: member.initialYearOfStudy,
        initialSemester: member.initialSemester,
    });

    return currentYear > member.courseRelation.durationYears;
}

// ── Batch-safe helpers (avoids N+1 queries in report loops) ─────────────────

export interface AcademicPeriodRow {
    startDate: Date;
    endDate: Date;
}

/**
 * Fetch all academic periods once, ordered by startDate.
 * Pass the result into computeCurrentYearFromPeriods for each member
 * to avoid one DB query per attendee in report generation.
 */
export async function fetchAllAcademicPeriods(): Promise<AcademicPeriodRow[]> {
    return prisma.academicPeriod.findMany({
        select: { startDate: true, endDate: true },
        orderBy: { startDate: 'asc' },
    });
}

/**
 * Pure (synchronous) computation of a member's current academic year
 * given a pre-fetched list of all academic periods.
 *
 * Returns null when any required academic field is missing.
 */
export function computeCurrentYearFromPeriods(
    member: {
        registrationDate: Date | null;
        initialYearOfStudy: number | null;
        initialSemester: number | null;
    },
    allPeriods: AcademicPeriodRow[],
    now: Date = new Date()
): number | null {
    if (
        !member.registrationDate ||
        !member.initialYearOfStudy ||
        !member.initialSemester
    ) {
        return null;
    }

    const regDate = member.registrationDate;

    // Count periods that started after registration AND have fully ended by now
    const periodsElapsed = allPeriods.filter(
        (p) => p.startDate >= regDate && p.endDate <= now
    ).length;

    const totalSemesters =
        (member.initialYearOfStudy - 1) * 2 +
        member.initialSemester +
        periodsElapsed;

    return Math.ceil(totalSemesters / 2);
}
