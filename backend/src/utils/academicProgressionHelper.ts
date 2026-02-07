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
