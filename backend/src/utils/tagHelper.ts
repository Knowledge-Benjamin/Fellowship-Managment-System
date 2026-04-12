import { PrismaClient } from '@prisma/client';

/**
 * Check if a member has an active, non-expired tag.
 * `prisma` is passed explicitly for tenant isolation.
 */
export const hasActiveTag = async (prisma: PrismaClient, memberId: string, tagName: string): Promise<boolean> => {
    const tag = await prisma.tag.findUnique({
        where: { name: tagName },
        select: { id: true },
    });

    if (!tag) return false;

    const memberTag = await prisma.memberTag.findFirst({
        where: {
            memberId,
            tagId: tag.id,
            isActive: true,
        },
    });

    if (!memberTag) return false;

    // Check if tag has expired
    if (memberTag.expiresAt && new Date() > new Date(memberTag.expiresAt)) {
        return false;
    }

    return true;
};

/**
 * Get all active, non-expired tag names for a member.
 */
export const getActiveTags = async (prisma: PrismaClient, memberId: string): Promise<string[]> => {
    const memberTags = await prisma.memberTag.findMany({
        where: {
            memberId,
            isActive: true,
        },
        include: {
            tag: {
                select: { name: true },
            },
        },
    });

    const validTags: string[] = [];
    const now = new Date();

    for (const mt of memberTags) {
        if (mt.expiresAt && now > new Date(mt.expiresAt)) continue;
        validTags.push(mt.tag.name);
    }

    return validTags;
};
