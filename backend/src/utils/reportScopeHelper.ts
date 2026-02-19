import prisma from '../prisma';

/**
 * Represents a user's report viewing scope based on their leadership role
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
 * Get the report scope for a user based on their leadership roles
 * @param userId - The ID of the user
 * @returns ReportScope object containing the user's access scope
 */
export const getUserReportScope = async (userId: string): Promise<ReportScope> => {
    const user = await prisma.member.findUnique({
        where: { id: userId },
        select: {
            role: true,
            headsRegion: {
                select: {
                    id: true,
                    name: true
                }
            },
            headsFamilies: {
                where: { isActive: true },
                select: {
                    id: true,
                    name: true
                }
            },
            leadsMinistryTeams: {
                select: {
                    id: true,
                    name: true
                }
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

/**
 * Build a Prisma filter for members based on report scope
 * Fellowship Managers see all members
 * Regional Heads see only their region
 * Family Heads see only their families
 * Team Leaders see only their teams
 * 
 * @param scope - The report scope object
 * @returns Prisma where clause for filtering members
 */
export const buildMemberScopeFilter = (scope: ReportScope): any => {
    // Fellowship Managers see everything
    if (scope.role === 'FELLOWSHIP_MANAGER') {
        return {};
    }

    // Regional Head - filter by region
    if (scope.regionId) {
        return {
            regionId: scope.regionId
        };
    }

    // Family Head - filter by family membership
    if (scope.familyIds.length > 0) {
        return {
            familyMemberships: {
                some: {
                    familyId: { in: scope.familyIds },
                    isActive: true
                }
            }
        };
    }

    // Team Leader - filter by team membership
    if (scope.teamIds.length > 0) {
        return {
            ministryMemberships: {
                some: {
                    teamId: { in: scope.teamIds },
                    isActive: true
                }
            }
        };
    }

    // Regular member or no leadership role - no access to reports
    throw new Error('Insufficient permissions to view reports');
};

/**
 * Check if a user has any leadership role
 * @param scope - The report scope object
 * @returns true if user is a leader, false otherwise
 */
export const isLeader = (scope: ReportScope): boolean => {
    return (
        scope.role === 'FELLOWSHIP_MANAGER' ||
        !!scope.regionId ||
        scope.familyIds.length > 0 ||
        scope.teamIds.length > 0
    );
};

/**
 * Get scope display name for UI
 * @param scope - The report scope object
 * @returns Human-readable scope description
 */
export const getScopeDisplayName = (scope: ReportScope): string => {
    if (scope.role === 'FELLOWSHIP_MANAGER') {
        return 'All Members';
    }
    if (scope.regionId && scope.regionName) {
        return `${scope.regionName} Region`;
    }
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
