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
    // Validate input
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }

    const { email, password } = result.data;

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
                select: {
                    id: true,
                    expiresAt: true,
                    isActive: true,
                    notes: true,
                    tag: true,
                },
            },
        },
    });

    // Use constant-time comparison to prevent timing attacks
    if (!user) {
        // Still hash even if user doesn't exist to prevent timing attacks
        await bcrypt.hash('dummy', 10);
        res.status(401);
        throw new Error('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    // Filter and auto-deactivate expired tags
    const now = new Date();
    const validTags = [];
    const expiredTagNames = [];

    for (const mt of user.memberTags) {
        if (mt.expiresAt && now > new Date(mt.expiresAt)) {
            // Auto-deactivate expired tag
            await prisma.memberTag.update({
                where: { id: mt.id },
                data: {
                    isActive: false,
                    removedAt: now,
                    notes: (mt.notes || '') + ' [Auto-expired on login]',
                },
            });
            expiredTagNames.push(mt.tag.name);
        } else if (mt.isActive) { // Only include tags that are currently active and not expired
            // Tag is valid (either no expiry or not yet expired)
            validTags.push({
                name: mt.tag.name,
                isActive: mt.isActive,
                color: mt.tag.color,
                expiresAt: mt.expiresAt,
            });
        }
    }

    // Prepare response message
    let message = 'Login successful';
    if (expiredTagNames.length > 0) {
        message += `. Note: The following access has expired: ${expiredTagNames.join(', ')}`;
    }

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
});
