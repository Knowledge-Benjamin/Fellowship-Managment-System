import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

// Validation schemas
const createTeamSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
});

const updateTeamSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    leaderId: z.string().uuid().nullable().optional(),
    assistantId: z.string().uuid().nullable().optional(),
});

// Helper function to generate tag names from team name
const generateTagNames = (teamName: string) => {
    // Convert "Worship Team" -> "WORSHIP_TEAM_LEADER" and "WORSHIP_TEAM_MEMBER"
    const baseName = teamName.toUpperCase().replace(/\s+/g, '_');
    return {
        leaderTag: `${baseName}_LEADER`,
        memberTag: `${baseName}_MEMBER`,
    };
};

// Create ministry team (Fellowship Manager only)
export const createTeam = async (req: Request, res: Response) => {
    try {
        const validatedData = createTeamSchema.parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check if team name already exists
        const existingTeam = await prisma.ministryTeam.findUnique({
            where: { name: validatedData.name },
        });

        if (existingTeam) {
            return res.status(400).json({ message: 'Team with this name already exists' });
        }

        // Generate tag names
        const { leaderTag, memberTag } = generateTagNames(validatedData.name);

        // Create team and tags in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the ministry team
            const team = await tx.ministryTeam.create({
                data: {
                    name: validatedData.name,
                    description: validatedData.description,
                    leaderTagName: leaderTag,
                    memberTagName: memberTag,
                    createdBy: userId,
                },
            });

            // Create leader tag
            await tx.tag.create({
                data: {
                    name: leaderTag,
                    description: `Leader of ${validatedData.name}`,
                    type: 'SYSTEM',
                    color: '#10b981', // Green
                    isSystem: true,
                    createdBy: userId,
                },
            });

            // Create member tag
            await tx.tag.create({
                data: {
                    name: memberTag,
                    description: `Member of ${validatedData.name}`,
                    type: 'SYSTEM',
                    color: '#3b82f6', // Blue
                    isSystem: true,
                    createdBy: userId,
                },
            });

            return team;
        });

        res.status(201).json({
            message: 'Ministry team created successfully',
            team: result,
            tags: { leaderTag, memberTag },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        console.error('Error creating team:', error);
        res.status(500).json({ message: 'Failed to create team' });
    }
};

// Get all ministry teams
export const getAllTeams = async (req: Request, res: Response) => {
    try {
        const teams = await prisma.ministryTeam.findMany({
            where: { isActive: true },
            include: {
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                assistant: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
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
            orderBy: { createdAt: 'asc' },
        });

        res.json(teams);
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ message: 'Failed to fetch teams' });
    }
};

// Get team by ID with full details
export const getTeamById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const team = await prisma.ministryTeam.findUnique({
            where: { id },
            include: {
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                assistant: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                members: {
                    where: { isActive: true },
                    include: {
                        member: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phoneNumber: true,
                                region: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        res.json(team);
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ message: 'Failed to fetch team' });
    }
};

// Update team
export const updateTeam = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = updateTeamSchema.parse(req.body);

        // If name is being updated, check for duplicates
        if (validatedData.name) {
            const existingTeam = await prisma.ministryTeam.findFirst({
                where: {
                    name: validatedData.name,
                    id: { not: id },
                },
            });

            if (existingTeam) {
                return res.status(400).json({ message: 'Team with this name already exists' });
            }
        }

        const team = await prisma.$transaction(async (tx) => {
            // Get current team data
            const currentTeam = await tx.ministryTeam.findUnique({
                where: { id },
                select: { name: true, leaderTagName: true, memberTagName: true },
            });

            if (!currentTeam) {
                throw new Error('Team not found');
            }

            // Update the team
            const updatedTeam = await tx.ministryTeam.update({
                where: { id },
                data: {
                    ...(validatedData.name && { name: validatedData.name }),
                    ...(validatedData.description !== undefined && { description: validatedData.description }),
                    ...(validatedData.leaderId !== undefined && { leaderId: validatedData.leaderId }),
                    ...(validatedData.assistantId !== undefined && { assistantId: validatedData.assistantId }),
                },
                include: {
                    leader: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                    assistant: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                },
            });

            // If name changed, update the tag names
            if (validatedData.name && validatedData.name !== currentTeam.name) {
                const { leaderTag: newLeaderTagName, memberTag: newMemberTagName } = generateTagNames(validatedData.name);

                // Update leader tag name
                await tx.tag.updateMany({
                    where: { name: currentTeam.leaderTagName },
                    data: { name: newLeaderTagName },
                });

                // Update member tag name
                await tx.tag.updateMany({
                    where: { name: currentTeam.memberTagName },
                    data: { name: newMemberTagName },
                });

                // Update the team's tag name references
                await tx.ministryTeam.update({
                    where: { id },
                    data: {
                        leaderTagName: newLeaderTagName,
                        memberTagName: newMemberTagName,
                    },
                });
            }

            return updatedTeam;
        });

        res.json({ message: 'Team updated successfully', team });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        console.error('Error updating team:', error);
        res.status(500).json({ message: 'Failed to update team' });
    }
};

// Delete team (soft delete - deactivates team and tags)
export const deleteTeam = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const team = await prisma.ministryTeam.findUnique({
            where: { id },
        });

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Deactivate team, remove members, and deactivate tags in transaction
        await prisma.$transaction(async (tx) => {
            // Deactivate all team members
            await tx.ministryTeamMember.updateMany({
                where: { teamId: id, isActive: true },
                data: {
                    isActive: false,
                    leftAt: new Date(),
                },
            });

            // Deactivate member tags
            await tx.memberTag.updateMany({
                where: {
                    tag: { name: { in: [team.leaderTagName, team.memberTagName] } },
                    isActive: true,
                },
                data: { isActive: false, removedAt: new Date() },
            });

            // Deactivate team
            await tx.ministryTeam.update({
                where: { id },
                data: { isActive: false },
            });
        });

        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ message: 'Failed to delete team' });
    }
};

// Add member to team
export const addTeamMember = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { memberId, role, notes } = req.body;
        const assignerId = req.user?.id;

        if (!assignerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check if member is already active in this team
        const existingMember = await prisma.ministryTeamMember.findFirst({
            where: {
                teamId: id,
                memberId,
                isActive: true,
            },
        });

        if (existingMember) {
            return res.status(400).json({ message: 'Member is already in this team' });
        }

        // Get team to fetch tag names
        const team = await prisma.ministryTeam.findUnique({
            where: { id },
        });

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Get member tag
        const memberTag = await prisma.tag.findUnique({
            where: { name: team.memberTagName },
        });

        if (!memberTag) {
            return res.status(404).json({ message: 'Team member tag not found' });
        }

        // Add member and assign tag in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Add to team
            const teamMember = await tx.ministryTeamMember.create({
                data: {
                    teamId: id,
                    memberId,
                    role,
                    notes,
                    assignedBy: assignerId,
                },
            });

            // Assign member tag
            await tx.memberTag.create({
                data: {
                    memberId,
                    tagId: memberTag.id,
                    assignedBy: assignerId,
                    notes: `Member of ${team.name}${role ? ` - ${role}` : ''}`,
                },
            });

            return teamMember;
        });

        res.status(201).json({ message: 'Member added to team successfully', teamMember: result });
    } catch (error) {
        console.error('Error adding team member:', error);
        res.status(500).json({ message: 'Failed to add team member' });
    }
};

// Remove member from team
export const removeTeamMember = async (req: Request, res: Response) => {
    try {
        const { id, memberId } = req.params;
        const removerId = req.user?.id;

        if (!removerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get team to fetch tag names
        const team = await prisma.ministryTeam.findUnique({
            where: { id },
        });

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Get member tag
        const memberTag = await prisma.tag.findUnique({
            where: { name: team.memberTagName },
        });

        // Remove from team and deactivate tag in transaction
        await prisma.$transaction(async (tx) => {
            // Deactivate team membership
            await tx.ministryTeamMember.updateMany({
                where: {
                    teamId: id,
                    memberId,
                    isActive: true,
                },
                data: {
                    isActive: false,
                    leftAt: new Date(),
                },
            });

            // Deactivate member tag
            if (memberTag) {
                await tx.memberTag.updateMany({
                    where: {
                        memberId,
                        tagId: memberTag.id,
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

        res.json({ message: 'Member removed from team successfully' });
    } catch (error) {
        console.error('Error removing team member:', error);
        res.status(500).json({ message: 'Failed to remove team member' });
    }
};

// Get team where current user is team leader
export const getMyTeam = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // First, get the team to find the leader tag name
        const userTeam = await prisma.ministryTeam.findFirst({
            where: { leaderId: userId, isActive: true },
            select: { leaderTagName: true },
        });

        if (userTeam) {
            // Check if the leader tag is still active and not expired
            const leaderTag = await prisma.tag.findFirst({
                where: { name: userTeam.leaderTagName },
            });

            if (leaderTag) {
                const memberTag = await prisma.memberTag.findFirst({
                    where: {
                        memberId: userId,
                        tagId: leaderTag.id,
                        isActive: true,
                    },
                });

                // Auto-deactivate if expired
                if (memberTag?.expiresAt && new Date() > new Date(memberTag.expiresAt)) {
                    await prisma.memberTag.update({
                        where: { id: memberTag.id },
                        data: {
                            isActive: false,
                            removedAt: new Date(),
                            notes: (memberTag.notes || '') + ' [Auto-expired]',
                        },
                    });
                    return res.status(403).json({ message: 'Your team leader access has expired' });
                }
            }
        }

        // Find team where user is the leader
        const team = await prisma.ministryTeam.findFirst({
            where: {
                leaderId: userId,
                isActive: true,
            },
            include: {
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                assistant: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                members: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        member: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                phoneNumber: true,
                                fellowshipNumber: true,
                                gender: true,
                            },
                        },
                        joinedAt: true,
                    },
                    orderBy: {
                        joinedAt: 'asc',
                    },
                },
            },
        });

        if (!team) {
            return res.status(404).json({ message: 'You are not assigned as a team leader' });
        }

        // Calculate stats
        const members = team.members.map(m => m.member);
        const stats = {
            totalMembers: members.length,
            maleCount: members.filter(m => m.gender === 'MALE').length,
            femaleCount: members.filter(m => m.gender === 'FEMALE').length,
        };

        // Format response
        const response = {
            id: team.id,
            name: team.name,
            description: team.description,
            leader: team.leader,
            assistant: team.assistant,
            leaderTagName: team.leaderTagName,
            memberTagName: team.memberTagName,
            members: team.members.map(m => ({
                ...m.member,
                joinedAt: m.joinedAt,
            })),
            stats,
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching my team:', error);
        res.status(500).json({ message: 'Failed to fetch team' });
    }
};
