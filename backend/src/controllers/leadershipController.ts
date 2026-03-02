import { Request, Response } from 'express';
import prisma from '../prisma';
import { formatRegionName } from '../utils/displayFormatters';
import { activeMemberFilter } from '../utils/queryHelpers';

// Get organizational structure  
export const getOrgStructure = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        // Check if user is a Regional Head
        let regionalHeadRegionId: string | null = null;
        if (userRole !== 'FELLOWSHIP_MANAGER') {
            const regionalHeadRegion = await prisma.region.findFirst({
                where: { regionalHeadId: userId },
                select: { id: true },
            });
            if (regionalHeadRegion) {
                regionalHeadRegionId = regionalHeadRegion.id;
            }
        }

        // Build filter based on user role
        const regionFilter = regionalHeadRegionId ? { id: regionalHeadRegionId } : {};

        // Fetch regions (all for FM, only their region for Regional Head)
        const regions = await prisma.region.findMany({
            where: regionFilter,
            include: {
                regionalHead: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                families: {
                    where: { isActive: true },
                    include: {
                        familyHead: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                        _count: {
                            select: {
                                members: {
                                    where: { isActive: true },
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        // Fetch all ministry teams (only FM should see teams)
        const teams = userRole === 'FELLOWSHIP_MANAGER' ? await prisma.ministryTeam.findMany({
            where: { isActive: true },
            include: {
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        members: {
                            where: {
                                isActive: true,
                                member: activeMemberFilter
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        }) : [];

        // Get total member count (filtered by region if Regional Head)
        const memberFilter = regionalHeadRegionId
            ? { regionId: regionalHeadRegionId, ...activeMemberFilter }
            : { ...activeMemberFilter };
        const totalMembers = await prisma.member.count({ where: memberFilter });

        // Transform region names for display
        const formattedRegions = regions.map(region => ({
            ...region,
            name: formatRegionName(region.name)
        }));

        res.json({
            regions: formattedRegions,
            ministryTeams: teams,
            stats: {
                totalMembers,
                totalRegions: formattedRegions.length,
                totalFamilies: formattedRegions.reduce((sum, r) => sum + r.families.length, 0),
                totalTeams: teams.length,
            },
        });
    } catch (error) {
        console.error('Error fetching org structure:', error);
        res.status(500).json({ message: 'Failed to fetch organizational structure' });
    }
};

// Assign regional head (replaces existing head automatically)
export const assignRegionalHead = async (req: Request, res: Response) => {
    try {
        const { regionId, memberId } = req.body;
        const assignerId = req.user?.id;

        if (!assignerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Fetch both the target region and the incoming member in parallel
        const [region, member] = await Promise.all([
            prisma.region.findUnique({
                where: { id: regionId },
                select: { id: true, name: true, regionalHeadId: true },
            }),
            prisma.member.findUnique({
                where: { id: memberId },
                include: { headsRegion: true },
            }),
        ]);

        if (!region) {
            return res.status(404).json({ message: 'Region not found' });
        }

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.isDeleted) {
            return res.status(400).json({ message: 'Cannot assign deleted member as regional head' });
        }

        // Prevent assigning a member who already heads a DIFFERENT region
        if (member.headsRegion && member.headsRegion.id !== regionId) {
            return res.status(400).json({
                message: `Member is already heading ${member.headsRegion.name} region`,
            });
        }

        // Get or create REGIONAL_HEAD tag
        let regionalHeadTag = await prisma.tag.findFirst({
            where: { name: 'REGIONAL_HEAD' },
        });

        if (!regionalHeadTag) {
            regionalHeadTag = await prisma.tag.create({
                data: {
                    name: 'REGIONAL_HEAD',
                    description: 'Regional Head',
                    type: 'SYSTEM',
                    color: '#8b5cf6',
                    isSystem: true,
                    createdBy: assignerId,
                },
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Auto-remove existing head if there is one (and it's not the same member)
            if (region.regionalHeadId && region.regionalHeadId !== memberId) {
                await tx.memberTag.updateMany({
                    where: {
                        memberId: region.regionalHeadId,
                        tagId: regionalHeadTag!.id,
                        isActive: true,
                    },
                    data: {
                        isActive: false,
                        removedAt: new Date(),
                        removedBy: assignerId,
                        notes: `Replaced as Regional Head of ${region.name}`,
                    },
                });
            }

            // Assign new head to region
            const updatedRegion = await tx.region.update({
                where: { id: regionId },
                data: { regionalHeadId: memberId },
                include: {
                    regionalHead: {
                        select: { id: true, fullName: true, email: true },
                    },
                },
            });

            // Assign REGIONAL_HEAD tag to new head (skip if already active)
            const existingTag = await tx.memberTag.findFirst({
                where: { memberId, tagId: regionalHeadTag!.id, isActive: true },
            });

            if (!existingTag) {
                await tx.memberTag.create({
                    data: {
                        memberId,
                        tagId: regionalHeadTag!.id,
                        assignedBy: assignerId,
                        notes: `Regional Head of ${updatedRegion.name}`,
                    },
                });
            }

            // Require re-authentication for elevated privileges
            await tx.member.update({
                where: { id: memberId },
                data: { requiresReauth: true },
            });

            return updatedRegion;
        });

        res.json({ message: 'Regional head assigned successfully', region: result });
    } catch (error) {
        console.error('Error assigning regional head:', error);
        res.status(500).json({ message: 'Failed to assign regional head' });
    }
};


// Remove regional head
export const removeRegionalHead = async (req: Request<{ regionId: string }>, res: Response) => {
    try {
        const { regionId } = req.params;
        const removerId = req.user?.id;

        if (!removerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const region = await prisma.region.findUnique({
            where: { id: regionId },
        });

        if (!region || !region.regionalHeadId) {
            return res.status(404).json({ message: 'Regional head not found' });
        }

        // Store the regionalHeadId (we verified it's not null above)
        const regionalHeadId = region.regionalHeadId;

        // Get REGIONAL_HEAD tag
        const regionalHeadTag = await prisma.tag.findFirst({
            where: { name: 'REGIONAL_HEAD' },
        });

        // Remove in transaction
        await prisma.$transaction(async (tx) => {
            // Remove from region
            await tx.region.update({
                where: { id: regionId },
                data: { regionalHeadId: null },
            });

            // Deactivate tag
            if (regionalHeadTag) {
                await tx.memberTag.updateMany({
                    where: {
                        memberId: regionalHeadId,
                        tagId: regionalHeadTag.id,
                        isActive: true,
                    },
                    data: {
                        isActive: false,
                        removedAt: new Date(),
                        removedBy: removerId,
                    },
                });
            }
        });

        res.json({ message: 'Regional head removed successfully' });
    } catch (error) {
        console.error('Error removing regional head:', error);
        res.status(500).json({ message: 'Failed to remove regional head' });
    }
};

// Get leadership stats
export const getLeadershipStats = async (req: Request, res: Response) => {
    try {
        const [
            regionalHeadsCount,
            familyHeadsCount,
            teamLeadersCount,
            familiesCount,
            teamsCount,
        ] = await Promise.all([
            prisma.region.count({ where: { regionalHeadId: { not: null } } }),
            prisma.familyGroup.count({ where: { familyHeadId: { not: null }, isActive: true } }),
            prisma.ministryTeam.count({ where: { leaderId: { not: null }, isActive: true } }),
            prisma.familyGroup.count({ where: { isActive: true } }),
            prisma.ministryTeam.count({ where: { isActive: true } }),
        ]);

        res.json({
            regionalHeads: regionalHeadsCount,
            familyHeads: familyHeadsCount,
            teamLeaders: teamLeadersCount,
            totalFamilies: familiesCount,
            totalTeams: teamsCount,
        });
    } catch (error) {
        console.error('Error fetching leadership stats:', error);
        res.status(500).json({ message: 'Failed to fetch leadership statistics' });
    }
};
