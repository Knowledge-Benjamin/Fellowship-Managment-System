import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler';
import { isPrivilegedAccount, isAccountLocked, getRemainingLockoutTime } from '../utils/securityHelper';
import { createOTP, verifyOTP as verifyOTPCode } from '../services/otpService';
import { sendOTPEmail, sendAccountLockedEmail } from '../services/emailService';

// Input validation schemas
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

const verifyOTPSchema = z.object({
    tempToken: z.string().min(1, 'Temporary token is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

const resendOTPSchema = z.object({
    tempToken: z.string().min(1, 'Temporary token is required'),
});

// JWT token generation
const generateToken = (id: string, expiresIn: string = '30d') => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
};

// Generate temporary token for OTP flow (short-lived, 10 minutes)
const generateTempToken = (id: string) => {
    return generateToken(id, '10m'); // 10 minutes expiry
};

/**
 * Step 1: Login with email/password
 * - Regular members: Get full access token
 * - Privileged accounts: Get temporary token, OTP sent to email
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
    console.log('[LOGIN] Request received:', { email: req.body.email, ip: req.ip });

    // Validate input
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        console.log('[LOGIN] Validation failed:', result.error.issues[0].message);
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }

    const { email, password } = result.data;

    // Find user with all necessary relations for privilege check
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
            headsRegion: true,
            headsFamilies: true,
            leadsMinistryTeams: true,
        },
    });

    console.log('[LOGIN] User found:', !!user, 'Role:', user?.role);

    // Use constant-time comparison to prevent timing attacks
    if (!user) {
        console.log('[LOGIN] User not found');
        // Still hash even if user doesn't exist to prevent timing attacks
        await bcrypt.hash('dummy', 10);

        // Log failed attempt
        await prisma.loginAttempt.create({
            data: {
                email,
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('user-agent'),
                success: false,
                reason: 'invalid_email',
            },
        });

        res.status(401);
        throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
        const remainingMinutes = getRemainingLockoutTime(user);
        console.log(`[LOGIN] Account locked for ${remainingMinutes} more minutes`);

        // Log attempt
        await prisma.loginAttempt.create({
            data: {
                memberId: user.id,
                email,
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('user-agent'),
                success: false,
                reason: 'account_locked',
            },
        });

        res.status(403);
        throw new Error(`Account locked. Try again in ${remainingMinutes} minutes.`);
    }

    // Update last login attempt time
    await prisma.member.update({
        where: { id: user.id },
        data: { lastLoginAttempt: new Date() },
    });

    // Verify password
    console.log('[LOGIN] Comparing password');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
        console.log('[LOGIN] Invalid password');

        // Increment failed attempts
        const updatedUser = await prisma.member.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: {
                    increment: 1,
                },
            },
        });

        // Log failed attempt
        await prisma.loginAttempt.create({
            data: {
                memberId: user.id,
                email,
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('user-agent'),
                success: false,
                reason: 'invalid_password',
            },
        });

        // Check if should lock account (5 failed attempts)
        if (updatedUser.failedLoginAttempts >= 5) {
            const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
            await prisma.member.update({
                where: { id: user.id },
                data: {
                    lockedUntil: lockUntil,
                },
            });

            console.log(`[LOGIN] Account locked until ${lockUntil.toISOString()}`);

            // Send lockout email notification
            await sendAccountLockedEmail(user.email, user.fullName, lockUntil);

            res.status(403);
            throw new Error('Account locked due to multiple failed attempts. Please try again in 30 minutes.');
        }

        const attemptsRemaining = 5 - updatedUser.failedLoginAttempts;
        res.status(401);
        throw new Error(`Invalid email or password. ${attemptsRemaining} attempt(s) remaining before lockout.`);
    }

    console.log('[LOGIN] Password valid');

    // Reset failed attempts on successful password validation
    await prisma.member.update({
        where: { id: user.id },
        data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
        },
    });

    // Check if this is a privileged account
    const requiresMFA = await isPrivilegedAccount(user);

    if (requiresMFA) {
        console.log('[LOGIN] Privileged account detected - MFA required');

        // Generate and send OTP
        const otpCode = await createOTP(user.id);
        const emailSent = await sendOTPEmail(user.email, user.fullName, otpCode);

        if (!emailSent) {
            console.error('[LOGIN] Failed to send OTP email');
            // Don't block login but log the issue
        }

        // Generate temporary token
        const tempToken = generateTempToken(user.id);

        // Log partial success (password validated, OTP sent)
        await prisma.loginAttempt.create({
            data: {
                memberId: user.id,
                email,
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('user-agent'),
                success: false,
                reason: 'awaiting_otp',
            },
        });

        // Return response indicating OTP is required
        res.json({
            requiresOTP: true,
            tempToken,
            message: 'Verification code sent to your email. Please enter the 6-digit code to continue.',
        });
        return;
    }

    // Regular member - no MFA required
    console.log('[LOGIN] Regular member - no MFA required');

    // Filter and process tags
    const validTags = user.memberTags
        .filter((mt) => mt.tag && mt.isActive)
        .map((mt) => ({
            name: mt.tag!.name,
            isActive: mt.isActive,
            color: mt.tag!.color,
            expiresAt: mt.expiresAt,
        }));

    // Record successful login
    await prisma.member.update({
        where: { id: user.id },
        data: {
            lastSuccessfulLogin: new Date(),
        },
    });

    // Log successful login
    await prisma.loginAttempt.create({
        data: {
            memberId: user.id,
            email,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent'),
            success: true,
        },
    });

    console.log('[LOGIN] Response sent successfully for:', email);

    // Successful login - return full token
    res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        fellowshipNumber: user.fellowshipNumber,
        qrCode: user.qrCode,
        tags: validTags,
        message: 'Login successful',
        token: generateToken(user.id),
    });
});

/**
 * Step 2: Verify OTP (for privileged accounts only)
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    console.log('[VERIFY OTP] Request received');

    // Validate input
    const result = verifyOTPSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }

    const { tempToken, otp } = result.data;

    // Verify temporary token
    let decoded;
    try {
        decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as { id: string };
    } catch (error) {
        console.log('[VERIFY OTP] Invalid or expired temporary token');
        res.status(401);
        throw new Error('Session expired. Please log in again.');
    }

    const memberId = decoded.id;
    console.log(`[VERIFY OTP] Verifying OTP for member ${memberId}`);

    // Verify OTP code
    const verification = await verifyOTPCode(memberId, otp);

    if (!verification.success) {
        console.log('[VERIFY OTP] Verification failed:', verification.reason);
        res.status(401);
        throw new Error(verification.reason || 'Invalid OTP');
    }

    // Fetch user with tags
    const user = await prisma.member.findUnique({
        where: { id: memberId },
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

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Filter tags
    const validTags = user.memberTags
        .filter((mt) => mt.tag && mt.isActive)
        .map((mt) => ({
            name: mt.tag!.name,
            isActive: mt.isActive,
            color: mt.tag!.color,
            expiresAt: mt.expiresAt,
        }));

    // Record successful login
    await prisma.member.update({
        where: { id: user.id },
        data: {
            lastSuccessfulLogin: new Date(),
        },
    });

    // Log successful login
    await prisma.loginAttempt.create({
        data: {
            memberId: user.id,
            email: user.email,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent'),
            success: true,
        },
    });

    console.log('[VERIFY OTP] OTP verified successfully for:', user.email);

    // Return full access token
    res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        fellowshipNumber: user.fellowshipNumber,
        qrCode: user.qrCode,
        tags: validTags,
        message: 'Login successful',
        token: generateToken(user.id),
    });
});

/**
 * Resend OTP
 */
export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
    console.log('[RESEND OTP] Request received');

    // Validate input
    const result = resendOTPSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }

    const { tempToken } = result.data;

    // Verify temporary token
    let decoded;
    try {
        decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as { id: string };
    } catch (error) {
        console.log('[RESEND OTP] Invalid or expired temporary token');
        res.status(401);
        throw new Error('Session expired. Please log in again.');
    }

    const memberId = decoded.id;
    console.log(`[RESEND OTP] Resending OTP for member ${memberId}`);

    // Fetch user
    const user = await prisma.member.findUnique({
        where: { id: memberId },
    });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Generate and send new OTP
    const otpCode = await createOTP(memberId);
    const emailSent = await sendOTPEmail(user.email, user.fullName, otpCode);

    if (!emailSent) {
        console.error('[RESEND OTP] Failed to send OTP email');
        res.status(500);
        throw new Error('Failed to send OTP. Please try again.');
    }

    console.log('[RESEND OTP] OTP resent successfully to:', user.email);

    res.json({
        message: 'Verification code resent to your email.',
    });
});
