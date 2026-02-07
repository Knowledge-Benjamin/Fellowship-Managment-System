import prisma from '../prisma';
import crypto from 'crypto';

/**
 * Generate a 6-digit OTP code
 */
export const generateOTP = (): string => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Create and store OTP for a member
 */
export const createOTP = async (memberId: string): Promise<string> => {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate any existing OTPs for this member
    await prisma.oTP.updateMany({
        where: {
            memberId,
            verified: false,
            expiresAt: {
                gt: new Date(),
            },
        },
        data: {
            verified: true, // Mark as used/invalid
        },
    });

    // Create new OTP
    await prisma.oTP.create({
        data: {
            memberId,
            code,
            expiresAt,
        },
    });

    console.log(`[OTP] Created OTP for member ${memberId}, expires at ${expiresAt.toISOString()}`);
    return code;
};

/**
 * Verify OTP code for a member
 */
export const verifyOTP = async (
    memberId: string,
    code: string
): Promise<{ success: boolean; reason?: string }> => {
    // Find the latest unverified OTP for this member
    const otp = await prisma.oTP.findFirst({
        where: {
            memberId,
            verified: false,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (!otp) {
        console.log(`[OTP] No active OTP found for member ${memberId}`);
        return { success: false, reason: 'No active OTP found. Please request a new code.' };
    }

    // Check if expired
    if (new Date() > otp.expiresAt) {
        console.log(`[OTP] OTP expired for member ${memberId}`);
        await prisma.oTP.update({
            where: { id: otp.id },
            data: { verified: true }, // Mark as used
        });
        return { success: false, reason: 'OTP has expired. Please request a new code.' };
    }

    // Check attempts
    if (otp.attempts >= 3) {
        console.log(`[OTP] Max attempts reached for member ${memberId}`);
        await prisma.oTP.update({
            where: { id: otp.id },
            data: { verified: true }, // Invalidate
        });
        return { success: false, reason: 'Too many failed attempts. Please request a new code.' };
    }

    // Increment attempts
    await prisma.oTP.update({
        where: { id: otp.id },
        data: {
            attempts: {
                increment: 1,
            },
        },
    });

    // Verify code
    if (otp.code !== code) {
        console.log(`[OTP] Invalid OTP code for member ${memberId}. Attempts: ${otp.attempts + 1}/3`);
        return {
            success: false,
            reason: `Invalid code. ${2 - otp.attempts} attempt(s) remaining.`,
        };
    }

    // Success - mark as verified
    await prisma.oTP.update({
        where: { id: otp.id },
        data: {
            verified: true,
        },
    });

    console.log(`[OTP] Successfully verified OTP for member ${memberId}`);
    return { success: true };
};

/**
 * Check if a member has an active, unverified OTP
 */
export const hasActiveOTP = async (memberId: string): Promise<boolean> => {
    const otp = await prisma.oTP.findFirst({
        where: {
            memberId,
            verified: false,
            expiresAt: {
                gt: new Date(),
            },
        },
    });

    return !!otp;
};

/**
 * Clean up expired OTPs (for background job)
 */
export const cleanupExpiredOTPs = async (): Promise<number> => {
    const result = await prisma.oTP.updateMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
            verified: false,
        },
        data: {
            verified: true,
        },
    });

    console.log(`[OTP CLEANUP] Marked ${result.count} expired OTPs as verified`);
    return result.count;
};

export default {
    generateOTP,
    createOTP,
    verifyOTP,
    hasActiveOTP,
    cleanupExpiredOTPs,
};
