import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler';

// Input validation schema
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

const generateToken = (id: string) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

export const login = asyncHandler(async (req: Request, res: Response) => {
    console.log('[LOGIN] Request received:', { email: req.body.email });

    // Validate input
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        console.log('[LOGIN] Validation failed:', result.error.issues[0].message);
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }
    console.log('[LOGIN] Validation passed');

    const { email, password } = result.data;

    console.log('[LOGIN] Querying database for user:', email);
    // Find user by email with active tags (including expiry info)
    const user = await prisma.member.findUnique({
        where: { email },
        include: {
            memberTags: {
                where: { isActive: true },
                include: {
                    tag: {
                        select: {
                            name: true,
                            color: true,
                        },
                    },
                },
            },
        },
    });
    console.log('[LOGIN] User found:', !!user, 'Role:', user?.role, 'MemberTags count:', user?.memberTags?.length);

    // Use constant-time comparison to prevent timing attacks
    if (!user) {
        console.log('[LOGIN] User not found');
        // Still hash even if user doesn't exist to prevent timing attacks
        await bcrypt.hash('dummy', 10);
        res.status(401);
        throw new Error('Invalid email or password');
    }

    console.log('[LOGIN] Comparing password');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
        console.log('[LOGIN] Invalid password');
        res.status(401);
        throw new Error('Invalid email or password');
    }
    console.log('[LOGIN] Password valid');

    // Filter and auto-deactivate expired tags
    console.log('[LOGIN] Processing tags, count:', user.memberTags.length);
    const now = new Date();
    const validTags = [];
    const expiredTagNames = [];

    for (const mt of user.memberTags) {
        console.log('[LOGIN] Processing memberTag:', mt.id, 'Has tag:', !!mt.tag, 'Tag name:', mt.tag?.name);
        // Skip if tag relation is missing (orphaned memberTag)
        if (!mt.tag) {
            console.warn(`[LOGIN] MemberTag ${mt.id} has missing tag relation - skipping`);
            continue;
        }

        // Check if expired
        if (mt.expiresAt && now > new Date(mt.expiresAt)) {
            console.log('[LOGIN] Tag expired, skipping:', mt.tag.name);
            expiredTagNames.push(mt.tag.name);
            // Don't try to update - just skip. Background job should handle deactivation.
            continue;
        }

        // Tag is valid and active
        if (mt.isActive) {
            validTags.push({
                name: mt.tag.name,
                isActive: mt.isActive,
                color: mt.tag.color,
                expiresAt: mt.expiresAt,
            });
        }
    }

    // Prepare response message
    console.log('[LOGIN] Tag processing complete. Valid tags:', validTags.length, 'Expired:', expiredTagNames.length);
    let message = 'Login successful';
    if (expiredTagNames.length > 0) {
        message += `. Note: The following access has expired: ${expiredTagNames.join(', ')}`;
    }

    console.log('[LOGIN] Preparing response');
    // Successful login
    res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        fellowshipNumber: user.fellowshipNumber,
        qrCode: user.qrCode,
        tags: validTags, // Only valid, non-expired tags
        message,
        token: generateToken(user.id),
    });
    console.log('[LOGIN] Response sent successfully for:', email);
});
