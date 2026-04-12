import { PrismaClient } from '@prisma/client';

/**
 * Represents a user's report viewing scope based on their leadership role.
 */
export interface ReportScope {
    role: string;
    regionId?: string;
    regionName?: string;
    familyIds: string[];
    familyNames: string[];
    teamIds: string[];
    teamNames: string[];
}

/**
 * Get the report scope for a user based on their leadership roles.
 * `prisma` is passed explicitly for tenant isolation.
 */
export const getUserReportScope = async (prisma: PrismaClient, userId: string): Promise<ReportScope> => {
    const user = await prisma.member.findUnique({
        where: { id: userId },
        select: {
            role: true,
            headsRegion: {
                select: { id: true, name: true }
            },
            headsFamilies: {
                where: { isActive: true },
                select: { id: true, name: true }
            },
            leadsMinistryTeams: {
                select: { id: true, name: true }
            }
        }
    });

    if (!user) {
        throw new Error('User not found');
    }

    return {
        role: user.role,
        regionId: user.headsRegion?.id,
        regionName: user.headsRegion?.name,
        familyIds: user.headsFamilies.map(f => f.id),
        familyNames: user.headsFamilies.map(f => f.name),
        teamIds: user.leadsMinistryTeams.map(t => t.id),
        teamNames: user.leadsMinistryTeams.map(t => t.name),
    };
};

export const buildMemberScopeFilter = (scope: ReportScope): any => {
    if (scope.role === 'FELLOWSHIP_MANAGER') return {};
    if (scope.regionId) return { regionId: scope.regionId };
    if (scope.familyIds.length > 0) {
        return { familyMemberships: { some: { familyId: { in: scope.familyIds }, isActive: true } } };
    }
    if (scope.teamIds.length > 0) {
        return { ministryMemberships: { some: { teamId: { in: scope.teamIds }, isActive: true } } };
    }
    throw new Error('Insufficient permissions to view reports');
};

export const isLeader = (scope: ReportScope): boolean => {
    return (
        scope.role === 'FELLOWSHIP_MANAGER' ||
        !!scope.regionId ||
        scope.familyIds.length > 0 ||
        scope.teamIds.length > 0
    );
};

export const getScopeDisplayName = (scope: ReportScope): string => {
    if (scope.role === 'FELLOWSHIP_MANAGER') return 'All Members';
    if (scope.regionId && scope.regionName) return `${scope.regionName} Region`;
    if (scope.familyNames.length > 0) {
        return scope.familyNames.length === 1
            ? `${scope.familyNames[0]} Family`
            : `${scope.familyNames.length} Families`;
    }
    if (scope.teamNames.length > 0) {
        return scope.teamNames.length === 1
            ? `${scope.teamNames[0]} Team`
            : `${scope.teamNames.length} Teams`;
    }
    return 'No Scope';
};
