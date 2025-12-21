import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';

// Validation schemas
const createTagSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(200).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

const assignTagSchema = z.object({
    tagId: z.string().uuid(),
    notes: z.string().max(500).optional(),
});

const bulkTagSchema = z.object({
    memberIds: z.array(z.string().uuid()).min(1),
    tagId: z.string().uuid(),
    notes: z.string().max(500).optional(),
});

// Get all tags with member counts
export const getAllTags = async (req: Request, res: Response) => {
    try {
        const tags = await prisma.tag.findMany({
            include: {
                _count: {
                    select: {
                        memberTags: {
                            where: { isActive: true },
                        },
                    },
                },
            },
            orderBy: [
                { isSystem: 'desc' }, // System tags first
                { createdAt: 'asc' },
            ],
        });

        const tagsWithCount = tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            description: tag.description,
            type: tag.type,
            color: tag.color,
            isSystem: tag.isSystem,
            showOnRegistration: tag.showOnRegistration,
            createdAt: tag.createdAt,
            memberCount: tag._count.memberTags,
        }));

        res.json(tagsWithCount);
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
};

// Create a new custom tag
export const createTag = async (req: Request, res: Response) => {
    try {
        const validatedData = createTagSchema.parse(req.body);

        // Check if tag name already exists
        const existing = await prisma.tag.findUnique({
            where: { name: validatedData.name },
        });

        if (existing) {
            return res.status(400).json({ error: 'Tag with this name already exists' });
        }

        const tag = await prisma.tag.create({
            data: {
                name: validatedData.name,
                description: validatedData.description,
                color: validatedData.color || '#6366f1',
                type: 'CUSTOM', // Force custom type
                isSystem: false,
                createdBy: req.user!.id,
            },
        });

        res.status(201).json(tag);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.issues });
        }
        console.error('Create tag error:', error);
        res.status(500).json({ error: 'Failed to create tag' });
    }
};

// Delete a custom tag
export const deleteTag = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const tag = await prisma.tag.findUnique({
            where: { id },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        if (tag.isSystem) {
            return res.status(403).json({ error: 'Cannot delete system tags' });
        }

        await prisma.tag.delete({
            where: { id },
        });

        res.json({ message: 'Tag deleted successfully' });
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
};

// Toggle showOnRegistration for a tag
export const updateTagRegistrationVisibility = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { showOnRegistration } = req.body;

        if (typeof showOnRegistration !== 'boolean') {
            return res.status(400).json({ error: 'showOnRegistration must be a boolean' });
        }

        const tag = await prisma.tag.findUnique({
            where: { id },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        const updatedTag = await prisma.tag.update({
            where: { id },
            data: { showOnRegistration },
        });

        res.json(updatedTag);
    } catch (error) {
        console.error('Update tag registration visibility error:', error);
        res.status(500).json({ error: 'Failed to update tag' });
    }
};

// Get all members with a specific tag
export const getMembersWithTag = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const tag = await prisma.tag.findUnique({
            where: { id },
            include: {
                memberTags: {
                    where: { isActive: true },
                    include: {
                        member: {
                            include: {
                                region: true,
                            },
                        },
                    },
                },
            },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        const members = tag.memberTags.map(mt => ({
            id: mt.member.id,
            fullName: mt.member.fullName,
            fellowshipNumber: mt.member.fellowshipNumber,
            email: mt.member.email,
            phoneNumber: mt.member.phoneNumber,
            region: mt.member.region,
            assignedAt: mt.assignedAt,
            expiresAt: mt.expiresAt,
            notes: mt.notes,
        }));

        res.json({
            tag: {
                id: tag.id,
                name: tag.name,
                description: tag.description,
                type: tag.type,
                color: tag.color,
                isSystem: tag.isSystem,
                showOnRegistration: tag.showOnRegistration,
            },
            members,
        });
    } catch (error) {
        console.error('Get members with tag error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
};

// Assign tag to a member
export const assignTagToMember = async (req: Request, res: Response) => {
    try {
        const { id: memberId } = req.params;
        const validatedData = assignTagSchema.parse(req.body);

        // Check if member exists
        const member = await prisma.member.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Check if tag exists
        const tag = await prisma.tag.findUnique({
            where: { id: validatedData.tagId },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        // Check if tag is already active for this member
        const existing = await prisma.memberTag.findFirst({
            where: {
                memberId,
                tagId: validatedData.tagId,
                isActive: true,
            },
        });

        if (existing) {
            return res.status(400).json({ error: 'Member already has this tag' });
        }

        const memberTag = await prisma.memberTag.create({
            data: {
                memberId,
                tagId: validatedData.tagId,
                assignedBy: req.user!.id,
                notes: validatedData.notes,
            },
            include: {
                tag: true,
            },
        });

        res.status(201).json({
            message: 'Tag assigned successfully',
            memberTag: {
                id: memberTag.id,
                tag: memberTag.tag,
                assignedAt: memberTag.assignedAt,
                notes: memberTag.notes,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.issues });
        }
        console.error('Assign tag error:', error);
        res.status(500).json({ error: 'Failed to assign tag' });
    }
};

// Remove tag from a member
export const removeTagFromMember = async (req: Request, res: Response) => {
    try {
        const { id: memberId, tagId } = req.params;
        const { notes } = req.body;

        const memberTag = await prisma.memberTag.findFirst({
            where: {
                memberId,
                tagId,
                isActive: true,
            },
        });

        if (!memberTag) {
            return res.status(404).json({ error: 'Tag assignment not found' });
        }

        await prisma.memberTag.update({
            where: { id: memberTag.id },
            data: {
                isActive: false,
                removedBy: req.user!.id,
                removedAt: new Date(),
                notes: notes || memberTag.notes,
            },
        });

        res.json({ message: 'Tag removed successfully' });
    } catch (error) {
        console.error('Remove tag error:', error);
        res.status(500).json({ error: 'Failed to remove tag' });
    }
};

// Bulk assign tags to multiple members
export const bulkAssignTags = async (req: Request, res: Response) => {
    try {
        const validatedData = bulkTagSchema.parse(req.body);

        // Check if tag exists
        const tag = await prisma.tag.findUnique({
            where: { id: validatedData.tagId },
        });

        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }

        // Get members who don't already have this tag
        const existingAssignments = await prisma.memberTag.findMany({
            where: {
                memberId: { in: validatedData.memberIds },
                tagId: validatedData.tagId,
                isActive: true,
            },
            select: { memberId: true },
        });

        const existingMemberIds = existingAssignments.map(a => a.memberId);
        const newMemberIds = validatedData.memberIds.filter(id => !existingMemberIds.includes(id));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ error: 'All selected members already have this tag' });
        }

        // Bulk create assignments
        const assignments = await prisma.memberTag.createMany({
            data: newMemberIds.map(memberId => ({
                memberId,
                tagId: validatedData.tagId,
                assignedBy: req.user!.id,
                notes: validatedData.notes,
            })),
        });

        res.status(201).json({
            message: `Tag assigned to ${assignments.count} member(s)`,
            count: assignments.count,
            skipped: existingMemberIds.length,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.issues });
        }
        console.error('Bulk assign tags error:', error);
        res.status(500).json({ error: 'Failed to assign tags' });
    }
};

// Bulk remove tags from multiple members
export const bulkRemoveTags = async (req: Request, res: Response) => {
    try {
        const validatedData = bulkTagSchema.parse(req.body);

        const result = await prisma.memberTag.updateMany({
            where: {
                memberId: { in: validatedData.memberIds },
                tagId: validatedData.tagId,
                isActive: true,
            },
            data: {
                isActive: false,
                removedBy: req.user!.id,
                removedAt: new Date(),
                notes: validatedData.notes,
            },
        });

        res.json({
            message: `Tag removed from ${result.count} member(s)`,
            count: result.count,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.issues });
        }
        console.error('Bulk remove tags error:', error);
        res.status(500).json({ error: 'Failed to remove tags' });
    }
};

// Get tag history for a member
export const getMemberTagHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const history = await prisma.memberTag.findMany({
            where: { memberId: id },
            include: {
                tag: true,
                assigner: {
                    select: {
                        fullName: true,
                        fellowshipNumber: true,
                    },
                },
                remover: {
                    select: {
                        fullName: true,
                        fellowshipNumber: true,
                    },
                },
            },
            orderBy: { assignedAt: 'desc' },
        });

        const formattedHistory = history.map(h => ({
            id: h.id,
            tag: h.tag,
            assignedBy: h.assigner,
            assignedAt: h.assignedAt,
            removedBy: h.remover,
            removedAt: h.removedAt,
            expiresAt: h.expiresAt,
            notes: h.notes,
            isActive: h.isActive,
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error('Get member tag history error:', error);
        res.status(500).json({ error: 'Failed to fetch tag history' });
    }
};
