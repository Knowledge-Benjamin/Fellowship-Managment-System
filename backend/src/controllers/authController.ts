import { Request, Response } from 'express';
import { activeMemberFilter } from '../utils/queryHelpers';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { isPrivilegedAccount, isAccountLocked, getRemainingLockoutTime } from '../utils/securityHelper';
import { createOTP, verifyOTP as verifyOTPCode } from '../services/otpService';
import { sendOTPEmail, sendAccountLockedEmail, sendPasswordChangedEmail, sendPasswordResetEmail } from '../services/emailService';
import { PrismaClient } from "@prisma/client";

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

const forceChangePasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
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
    const prisma = (req as any).prisma as PrismaClient;
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
    // Use findFirst instead of findUnique to allow soft-delete filtering
    const user = await prisma.member.findFirst({
        where: {
            email,
            ...activeMemberFilter // Prevent login for deleted users
        },
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

    // Check if this is a privileged account requiring MFA
    const requiresMFA = await isPrivilegedAccount(user);

    if (requiresMFA) {
        console.log('[LOGIN] Privileged account detected - MFA required');

        // Generate and send OTP
        const otpCode = await createOTP(prisma, user.id);
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

    // Record successful login and clear any reauth requirements
    await prisma.member.update({
        where: { id: user.id },
        data: {
            lastSuccessfulLogin: new Date(),
            requiresReauth: false,
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

    // Successful login - return full token or trigger forced reset
    res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        fellowshipNumber: user.fellowshipNumber,
        qrCode: user.qrCode,
        forcePasswordChange: user.forcePasswordChange,
        tags: validTags,
        message: 'Login successful',
        token: generateToken(user.id),
    });
});

/**
 * Step 2: Verify OTP (for privileged accounts only)
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
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
    const verification = await verifyOTPCode(prisma, memberId, otp);

    if (!verification.success) {
        console.log('[VERIFY OTP] Verification failed:', verification.reason);
        res.status(401);
        throw new Error(verification.reason || 'Invalid OTP');
    }

    // Fetch user with tags
    const user = await prisma.member.findFirst({
        where: {
            id: memberId,
            ...activeMemberFilter
        },
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

    // Record successful login and clear any reauth requirements
    await prisma.member.update({
        where: { id: user.id },
        data: {
            lastSuccessfulLogin: new Date(),
            requiresReauth: false,
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
        forcePasswordChange: user.forcePasswordChange,
        tags: validTags,
        message: 'Login successful',
        token: generateToken(user.id),
    });
});

/**
 * Resend OTP
 */
export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
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
    const user = await prisma.member.findFirst({
        where: {
            id: memberId,
            ...activeMemberFilter
        },
    });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Generate and send new OTP
    const otpCode = await createOTP(prisma, memberId);
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

/**
 * GET /auth/me
 * Returns the same user payload as login, using the existing JWT session.
 * Used by the frontend refreshUser() to sync tags/profile without re-login.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401);
        throw new Error('Unauthorized');
    }

    const user = await prisma.member.findFirst({
        where: { id: userId, ...activeMemberFilter },
        include: {
            memberTags: {
                where: { isActive: true },
                include: {
                    tag: {
                        select: { name: true, color: true },
                    },
                },
            },
        },
    });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const tags = user.memberTags
        .filter((mt) => mt.tag && mt.isActive)
        .map((mt) => ({
            name: mt.tag!.name,
            isActive: mt.isActive,
            color: mt.tag!.color,
            expiresAt: mt.expiresAt,
        }));

    res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        fellowshipNumber: user.fellowshipNumber,
        qrcCde: user.qrCode,
        forcePasswordChange: user.forcePasswordChange,
        tags,
    });
});

/**
 * Force Change Password (called when forcePasswordChange is true)
 * Requires standard email/old password combination to prevent direct API jumps, then applies the new password.
 */
export const forceChangePassword = asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    const result = forceChangePasswordSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }

    const { email, oldPassword, newPassword } = result.data;

    const user = await prisma.member.findFirst({
        where: { email, ...activeMemberFilter },
        include: {
            memberTags: {
                where: { isActive: true },
                include: { tag: { select: { name: true, color: true } } },
            },
        },
    });

    if (!user) {
        res.status(401);
        throw new Error('Invalid email or old password');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
        res.status(401);
        throw new Error('Invalid old password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.member.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            forcePasswordChange: false,
            lastSuccessfulLogin: new Date(),
        },
    });

    // Notify user
    await sendPasswordChangedEmail(user.email, user.fullName);

    const validTags = user.memberTags
        .filter((mt) => mt.tag && mt.isActive)
        .map((mt) => ({
            name: mt.tag!.name,
            isActive: mt.isActive,
            color: mt.tag!.color,
            expiresAt: mt.expiresAt,
        }));

    res.json({
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        fellowshipNumber: updatedUser.fellowshipNumber,
        qrCode: updatedUser.qrCode,
        forcePasswordChange: updatedUser.forcePasswordChange,
        tags: validTags,
        message: 'Password completely updated and logged in.',
        token: generateToken(updatedUser.id),
    });
});

/**
 * Change Password (Authenticated Profile endpoint)
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401);
        throw new Error('Unauthorized');
    }

    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }

    const { oldPassword, newPassword } = result.data;

    const user = await prisma.member.findFirst({
        where: { id: userId, ...activeMemberFilter },
    });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
        res.status(400);
        throw new Error('Incorrect current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.member.update({
        where: { id: user.id },
        data: { password: hashedPassword },
    });

    await sendPasswordChangedEmail(user.email, user.fullName);

    res.json({ message: 'Password updated successfully' });
});

// Zod schemas for password reset
const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Forgot Password - Send Reset Link
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }

    const { email } = result.data;
    
    // Use findFirst over findUnique when including soft-delete filters
    const user = await prisma.member.findFirst({
        where: { email, ...activeMemberFilter },
    });

    // We ALWAYS show the same success message even if the email doesn't exist to prevent email enumeration attacks
    if (!user) {
        // Dummy timing to prevent timing attacks
        await bcrypt.hash('dummy', 10);
        res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
        return;
    }

    // Generate a secure random token
    // 32 bytes = 256 bits, converted to hex
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token for database storage (prevent compromised DB from exposing tokens)
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Add token to database
    await prisma.passwordResetToken.create({
        data: {
            memberId: user.id,
            tokenHash,
            expiresAt,
            ipAddress: req.ip || 'unknown'
        }
    });

    // Send the email with the raw token (front-end URL)
    await sendPasswordResetEmail(user.email, user.fullName, resetToken);

    res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
});

/**
 * Reset Password - Consume Token and set new password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const prisma = (req as any).prisma as PrismaClient;
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400);
        throw new Error(result.error.issues[0].message);
    }

    const { token, newPassword } = result.data;

    // Hash the incoming token to look it up in the database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const resetRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { member: true }
    });

    if (!resetRecord) {
        res.status(400);
        throw new Error('Invalid or expired password reset link');
    }

    if (resetRecord.used) {
        res.status(400);
        throw new Error('This password reset link has already been used');
    }

    if (resetRecord.expiresAt < new Date()) {
        res.status(400);
        throw new Error('This password reset link has expired');
    }

    if (resetRecord.member.isDeleted) {
        res.status(400);
        throw new Error('Account inactive');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Run transaction to mark token used AND update password atomically
    await prisma.$transaction([
        prisma.member.update({
            where: { id: resetRecord.memberId },
            data: { 
                password: hashedPassword,
                // If they had a forced reset, this satisfies it
                forcePasswordChange: false,
                // Standard security practice: clear old sessions/lockouts
                failedLoginAttempts: 0,
                lockedUntil: null
            }
        }),
        prisma.passwordResetToken.update({
            where: { id: resetRecord.id },
            data: { used: true }
        })
    ]);

    // Notify user to confirm the change
    await sendPasswordChangedEmail(resetRecord.member.email, resetRecord.member.fullName);

    res.json({ message: 'Password has been successfully reset. You may now log in.' });
});
