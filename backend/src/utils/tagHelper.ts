import prisma from '../prisma';

/**
 * Check if a member has an active, non-expired tag
 * Auto-deactivates expired tags
 */
export const hasActiveTag = async (memberId: string, tagName: string): Promise<boolean> => {
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
        // Expired - return false without updating (avoids unique constraint violation)
        return false;
    }

    return true;
};

/**
 * Get all active, non-expired tags for a member
 */
export const getActiveTags = async (memberId: string): Promise<string[]> => {
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

    // Filter out expired tags and auto-deactivate them
    const validTags: string[] = [];
    const now = new Date();

    for (const mt of memberTags) {
        // Skip expired tags without updating (avoids unique constraint violation)
        if (mt.expiresAt && now > new Date(mt.expiresAt)) {
            continue; // Skip expired
        }
        validTags.push(mt.tag.name);
    }

    return validTags;
};
