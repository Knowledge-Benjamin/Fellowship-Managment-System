import { Member, MemberTag } from '@prisma/client';
import prisma from '../prisma';

/**
 * Check if a member is a privileged account requiring MFA
 * Privileged accounts: Fellowship Managers, Regional Heads, Team Leaders, Family Leaders, any tag ending with "_LEADER"
 */
export const isPrivilegedAccount = async (
    user: Member & {
        memberTags?: Array<MemberTag & { tag: { name: string } | null }>;
        headsRegion?: any;
        headsFamilies?: any[];
        leadsMinistryTeams?: any[];
    }
): Promise<boolean> => {
    // 1. Check role: Fellowship Manager
    if (user.role === 'FELLOWSHIP_MANAGER') {
        console.log(`[SECURITY] User ${user.email} is privileged: FELLOWSHIP_MANAGER role`);
        return true;
    }

    // 2. Check leadership relations: Regional Head, Family Head, Team Leader
    if (user.headsRegion) {
        console.log(`[SECURITY] User ${user.email} is privileged: Regional Head`);
        return true;
    }

    if (user.headsFamilies && user.headsFamilies.length > 0) {
        console.log(`[SECURITY] User ${user.email} is privileged: Family Head`);
        return true;
    }

    if (user.leadsMinistryTeams && user.leadsMinistryTeams.length > 0) {
        console.log(`[SECURITY] User ${user.email} is privileged: Team Leader`);
        return true;
    }

    // 3. Check tags: Any tag ending with "_LEADER"
    if (user.memberTags && user.memberTags.length > 0) {
        const hasLeaderTag = user.memberTags.some((mt) => {
            if (!mt.tag) return false;
            const isLeader = mt.tag.name.endsWith('_LEADER') && mt.isActive;
            if (isLeader) {
                console.log(`[SECURITY] User ${user.email} is privileged: ${mt.tag.name} tag`);
            }
            return isLeader;
        });

        if (hasLeaderTag) {
            return true;
        }
    }

    console.log(`[SECURITY] User ${user.email} is NOT privileged (regular member)`);
    return false;
};

/**
 * Check if an account is locked
 */
export const isAccountLocked = (user: Member): boolean => {
    if (!user.lockedUntil) return false;

    const isLocked = new Date() < user.lockedUntil;
    if (isLocked) {
        console.log(`[SECURITY] Account ${user.email} is locked until ${user.lockedUntil.toISOString()}`);
    }
    return isLocked;
};

/**
 * Get remaining lockout time in minutes
 */
export const getRemainingLockoutTime = (user: Member): number | null => {
    if (!user.lockedUntil || new Date() >= user.lockedUntil) {
        return null;
    }

    const remainingMs = user.lockedUntil.getTime() - Date.now();
    return Math.ceil(remainingMs / 60000); // Convert to minutes
};

/**
 * Fetch user with all necessary relations for privilege check
 */
export const getUserWithPrivilegeInfo = async (userId: string) => {
    return await prisma.member.findUnique({
        where: { id: userId },
        include: {
            memberTags: {
                where: { isActive: true },
                include: {
                    tag: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
            headsRegion: true,
            headsFamilies: true,
            leadsMinistryTeams: true,
        },
    });
};

export default {
    isPrivilegedAccount,
    isAccountLocked,
    getRemainingLockoutTime,
    getUserWithPrivilegeInfo,
};
