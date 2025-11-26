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

    // Find user by email
    const user = await prisma.member.findUnique({
        where: { email },
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

    // Successful login
    res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        fellowshipNumber: user.fellowshipNumber,
        qrCode: user.qrCode,
        token: generateToken(user.id),
    });
});
