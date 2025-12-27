import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

// Validation schemas
const createFamilySchema = z.object({
    name: z.string().min(1).max(100),
    regionId: z.string().uuid(),
});

const updateFamilySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    meetingDay: z.string().optional(),
    meetingTime: z.string().optional(),
    meetingVenue: z.string().optional(),
    dayLocked: z.boolean().optional(),
    timeLocked: z.boolean().optional(),
    venueLocked: z.boolean().optional(),
});

const assignHeadSchema = z.object({
    memberId: z.string().uuid(),
});

const addMemberSchema = z.object({
    memberId: z.string().uuid(),
});

// Helper: Generate family member tag name
const generateMemberTagName = (familyName: string): string => {
    return `${familyName.toUpperCase().replace(/\s+/g, '_')}_MEMBER`;
};

// Create family (Fellowship Manager only)
export const createFamily = async (req: Request, res: Response) => {
    try {
        const validatedData = createFamilySchema.parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check if family name exists in this region
        const existingFamily = await prisma.familyGroup.findFirst({
            where: {
                name: validatedData.name,
                regionId: validatedData.regionId,
                isActive: true,
            },
        });

        if (existingFamily) {
            return res.status(400).json({ message: 'Family with this name already exists in this region' });
        }

        // Generate member tag name
        const memberTagName = generateMemberTagName(validatedData.name);

        // Create family and tag in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create family
            const family = await tx.familyGroup.create({
                data: {
                    name: validatedData.name,
                    regionId: validatedData.regionId,
                    memberTagName,
                    createdBy: userId,
                },
                include: {
                    region: {
                        select: { name: true },
                    },
                },
            });

            // Create family member tag
            await tx.tag.create({
                data: {
                    name: memberTagName,
                    description: `Member of ${validatedData.name}`,
                    type: 'SYSTEM',
                    color: '#06b6d4', // Cyan
                    isSystem: true,
                    createdBy: userId,
                },
            });

            return family;
        });

        res.status(201).json({
            message: 'Family created successfully',
            family: result,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        console.error('Error creating family:', error);
        res.status(500).json({ message: 'Failed to create family' });
    }
};

// Get all families (with optional region filter for Regional Heads)
export const getAllFamilies = async (req: Request, res: Response) => {
    try {
        const { regionId } = req.query;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        // Build filter
        const where: any = { isActive: true };

        // Auto-filter for Regional Heads
        if (userRole !== 'FELLOWSHIP_MANAGER') {
            // Check if user is a Regional Head
            const regionalHeadRegion = await prisma.region.findFirst({
                where: { regionalHeadId: userId },
                select: { id: true },
            });

            if (regionalHeadRegion) {
                // Regional Head - filter to their region
                where.regionId = regionalHeadRegion.id;
            } else if (regionId) {
                // Not a Regional Head, but region filter provided
                where.regionId = regionId as string;
            }
        } else if (regionId) {
            // Fellowship Manager with explicit region filter
            where.regionId = regionId as string;
        }

        const families = await prisma.familyGroup.findMany({
            where,
            include: {
                region: {
                    select: { id: true, name: true },
                },
                familyHead: {
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
            orderBy: [
                { region: { name: 'asc' } },
                { name: 'asc' },
            ],
        });

        res.json(families);
    } catch (error) {
        console.error('Error fetching families:', error);
        res.status(500).json({ message: 'Failed to fetch families' });
    }
};

// Get family by ID with full details
export const getFamilyById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const family = await prisma.familyGroup.findUnique({
            where: { id },
            include: {
                region: {
                    select: { id: true, name: true },
                },
                familyHead: {
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
                                fellowshipNumber: true,
                            },
                        },
                    },
                    orderBy: {
                        joinedAt: 'asc',
                    },
                },
            },
        });

        if (!family) {
            return res.status(404).json({ message: 'Family not found' });
        }

        res.json(family);
    } catch (error) {
        console.error('Error fetching family:', error);
        res.status(500).json({ message: 'Failed to fetch family' });
    }
};

// Update family
export const updateFamily = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = updateFamilySchema.parse(req.body);

        // If name is being updated, check for duplicates in the same region
        if (validatedData.name) {
            const family = await prisma.familyGroup.findUnique({
                where: { id },
                select: { regionId: true },
            });

            if (!family) {
                return res.status(404).json({ message: 'Family not found' });
            }

            const existingFamily = await prisma.familyGroup.findFirst({
                where: {
                    name: validatedData.name,
                    regionId: family.regionId,
                    id: { not: id },
                    isActive: true,
                },
            });

            if (existingFamily) {
                return res.status(400).json({ message: 'Family with this name already exists in this region' });
            }
        }

        const updatedFamily = await prisma.familyGroup.update({
            where: { id },
            data: validatedData,
            include: {
                region: { select: { name: true } },
                familyHead: { select: { id: true, fullName: true } },
            },
        });

        res.json({ message: 'Family updated successfully', family: updatedFamily });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        console.error('Error updating family:', error);
        res.status(500).json({ message: 'Failed to update family' });
    }
};

// Delete family (soft delete)
export const deleteFamily = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const family = await prisma.familyGroup.findUnique({
            where: { id },
        });

        if (!family) {
            return res.status(404).json({ message: 'Family not found' });
        }

        // Soft delete family, members, and tag in transaction
        await prisma.$transaction(async (tx) => {
            // Deactivate all family members
            await tx.familyMember.updateMany({
                where: { familyId: id, isActive: true },
                data: {
                    isActive: false,
                    leftAt: new Date(),
                },
            });

            // Deactivate member tags
            await tx.memberTag.updateMany({
                where: {
                    tag: { name: family.memberTagName },
                    isActive: true,
                },
                data: { isActive: false, removedAt: new Date() },
            });

            // Deactivate family
            await tx.familyGroup.update({
                where: { id },
                data: { isActive: false },
            });
        });

        res.json({ message: 'Family deleted successfully' });
    } catch (error) {
        console.error('Error deleting family:', error);
        res.status(500).json({ message: 'Failed to delete family' });
    }
};

// Assign family head
export const assignFamilyHead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = assignHeadSchema.parse(req.body);
        const assignerId = req.user?.id;

        if (!assignerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get family
        const family = await prisma.familyGroup.findUnique({
            where: { id },
            include: { region: true },
        });

        if (!family) {
            return res.status(404).json({ message: 'Family not found' });
        }

        // Get member and check they're in the same region
        const member = await prisma.member.findUnique({
            where: { id: validatedData.memberId },
            include: { headsFamilies: true },
        });

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.regionId !== family.regionId) {
            return res.status(400).json({ message: 'Member must be in the same region as the family' });
        }

        // Check if member is already a family head
        const existingHeadship = member.headsFamilies.find(f => f.isActive);
        if (existingHeadship) {
            return res.status(400).json({
                message: `Member is already heading another family: ${existingHeadship.name}`,
            });
        }

        // Get or create FAMILY_HEAD tag
        let familyHeadTag = await prisma.tag.findFirst({
            where: { name: 'FAMILY_HEAD' },
        });

        if (!familyHeadTag) {
            familyHeadTag = await prisma.tag.create({
                data: {
                    name: 'FAMILY_HEAD',
                    description: 'Family Head',
                    type: 'SYSTEM',
                    color: '#22c55e', // Green
                    isSystem: true,
                    createdBy: assignerId,
                },
            });
        }

        // Assign in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Set family head
            const updatedFamily = await tx.familyGroup.update({
                where: { id },
                data: { familyHeadId: validatedData.memberId },
                include: {
                    familyHead: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                        },
                    },
                },
            });

            // Assign FAMILY_HEAD tag
            await tx.memberTag.create({
                data: {
                    memberId: validatedData.memberId,
                    tagId: familyHeadTag!.id,
                    assignedBy: assignerId,
                    notes: `Family Head of ${family.name}`,
                },
            });

            // Ensure member is also in the family
            const existingMembership = await tx.familyMember.findFirst({
                where: {
                    familyId: id,
                    memberId: validatedData.memberId,
                    isActive: true,
                },
            });

            if (!existingMembership) {
                // Add member to family
                await tx.familyMember.create({
                    data: {
                        familyId: id,
                        memberId: validatedData.memberId,
                        assignedBy: assignerId,
                    },
                });

                // Assign family member tag
                const memberTag = await tx.tag.findUnique({
                    where: { name: family.memberTagName },
                });

                if (memberTag) {
                    await tx.memberTag.create({
                        data: {
                            memberId: validatedData.memberId,
                            tagId: memberTag.id,
                            assignedBy: assignerId,
                            notes: `Member of ${family.name}`,
                        },
                    });
                }
            }

            return updatedFamily;
        });

        res.json({ message: 'Family head assigned successfully', family: result });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        console.error('Error assigning family head:', error);
        res.status(500).json({ message: 'Failed to assign family head' });
    }
};

// Remove family head
export const removeFamilyHead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const removerId = req.user?.id;

        if (!removerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const family = await prisma.familyGroup.findUnique({
            where: { id },
        });

        if (!family || !family.familyHeadId) {
            return res.status(404).json({ message: 'Family head not found' });
        }

        const familyHeadId = family.familyHeadId;

        // Get FAMILY_HEAD tag
        const familyHeadTag = await prisma.tag.findFirst({
            where: { name: 'FAMILY_HEAD' },
        });

        // Remove in transaction
        await prisma.$transaction(async (tx) => {
            // Clear family head
            await tx.familyGroup.update({
                where: { id },
                data: { familyHeadId: null },
            });

            // Deactivate FAMILY_HEAD tag
            if (familyHeadTag) {
                await tx.memberTag.updateMany({
                    where: {
                        memberId: familyHeadId,
                        tagId: familyHeadTag.id,
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

        res.json({ message: 'Family head removed successfully' });
    } catch (error) {
        console.error('Error removing family head:', error);
        res.status(500).json({ message: 'Failed to remove family head' });
    }
};

// Add member to family
export const addFamilyMember = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = addMemberSchema.parse(req.body);
        const assignerId = req.user?.id;

        if (!assignerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get family
        const family = await prisma.familyGroup.findUnique({
            where: { id },
        });

        if (!family) {
            return res.status(404).json({ message: 'Family not found' });
        }

        // Get member and verify same region
        const member = await prisma.member.findUnique({
            where: { id: validatedData.memberId },
        });

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.regionId !== family.regionId) {
            return res.status(400).json({ message: 'Member must be in the same region as the family' });
        }

        // Check if already in family
        const existing = await prisma.familyMember.findFirst({
            where: {
                familyId: id,
                memberId: validatedData.memberId,
                isActive: true,
            },
        });

        if (existing) {
            return res.status(400).json({ message: 'Member is already in this family' });
        }

        // Get family member tag
        const memberTag = await prisma.tag.findUnique({
            where: { name: family.memberTagName },
        });

        if (!memberTag) {
            return res.status(404).json({ message: 'Family member tag not found' });
        }

        // Add member in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Add to family
            const familyMember = await tx.familyMember.create({
                data: {
                    familyId: id,
                    memberId: validatedData.memberId,
                    assignedBy: assignerId,
                },
            });

            // Assign member tag
            await tx.memberTag.create({
                data: {
                    memberId: validatedData.memberId,
                    tagId: memberTag.id,
                    assignedBy: assignerId,
                    notes: `Member of ${family.name}`,
                },
            });

            return familyMember;
        });

        res.status(201).json({ message: 'Member added to family successfully', familyMember: result });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        console.error('Error adding family member:', error);
        res.status(500).json({ message: 'Failed to add family member' });
    }
};

// Remove member from family
export const removeFamilyMember = async (req: Request, res: Response) => {
    try {
        const { id, memberId } = req.params;
        const removerId = req.user?.id;

        if (!removerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get family
        const family = await prisma.familyGroup.findUnique({
            where: { id },
        });

        if (!family) {
            return res.status(404).json({ message: 'Family not found' });
        }

        // Get member tag
        const memberTag = await prisma.tag.findUnique({
            where: { name: family.memberTagName },
        });

        // Remove in transaction
        await prisma.$transaction(async (tx) => {
            // Deactivate family membership
            await tx.familyMember.updateMany({
                where: {
                    familyId: id,
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

        res.json({ message: 'Member removed from family successfully' });
    } catch (error) {
        console.error('Error removing family member:', error);
        res.status(500).json({ message: 'Failed to remove family member' });
    }
};

// Get family where current user is family head
export const getMyFamily = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Find family where user is the family head
        const family = await prisma.familyGroup.findFirst({
            where: {
                familyHeadId: userId,
                isActive: true,
            },
            include: {
                region: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                familyHead: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phoneNumber: true,
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

        if (!family) {
            return res.status(404).json({ message: 'You are not assigned as a family head' });
        }

        // Calculate stats
        const members = family.members.map(m => m.member);
        const stats = {
            totalMembers: members.length,
            maleCount: members.filter(m => m.gender === 'MALE').length,
            femaleCount: members.filter(m => m.gender === 'FEMALE').length,
        };

        // Format response
        const response = {
            id: family.id,
            name: family.name,
            region: family.region,
            familyHead: family.familyHead,
            meetingDay: family.meetingDay,
            meetingTime: family.meetingTime,
            meetingVenue: family.meetingVenue,
            members: family.members.map(m => ({
                ...m.member,
                joinedAt: m.joinedAt,
            })),
            stats,
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching my family:', error);
        res.status(500).json({ message: 'Failed to fetch family' });
    }
};
