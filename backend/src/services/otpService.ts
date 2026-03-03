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

    // Invalidate ALL existing unverified OTPs for this member (including expired ones)
    // so that stale records never pollute future lookups.
    await prisma.oTP.updateMany({
        where: {
            memberId,
            verified: false,
        },
        data: {
            verified: true,
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
    // Find the latest unverified, non-expired OTP for this member.
    // The expiresAt filter is critical: without it, stale expired rows (left with
    // verified=false from prior sessions) can be picked up, causing valid codes
    // to be rejected as "expired".
    const otp = await prisma.oTP.findFirst({
        where: {
            memberId,
            verified: false,
            expiresAt: { gt: new Date() }, // Bug 1 fix: only find non-expired OTPs
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (!otp) {
        console.log(`[OTP] No active OTP found for member ${memberId}`);
        return { success: false, reason: 'No active OTP found. Please request a new code.' };
    }

    // Check attempts BEFORE doing anything else
    if (otp.attempts >= 3) {
        console.log(`[OTP] Max attempts reached for member ${memberId}`);
        await prisma.oTP.update({
            where: { id: otp.id },
            data: { verified: true }, // Invalidate
        });
        return { success: false, reason: 'Too many failed attempts. Please request a new code.' };
    }

    // Compare code FIRST — only burn an attempt on a wrong code.
    // Bug 2 fix: the old code incremented before comparison, which meant a
    // double-submit or network retry could exhaust attempts even on a correct code.
    if (otp.code !== code) {
        const newAttempts = otp.attempts + 1;
        const remaining = 3 - newAttempts;

        // Mark as exhausted if this was the last allowed attempt
        await prisma.oTP.update({
            where: { id: otp.id },
            data: {
                attempts: { increment: 1 },
                ...(remaining === 0 && { verified: true }), // Invalidate on last attempt
            },
        });

        console.log(`[OTP] Invalid OTP code for member ${memberId}. Attempts: ${newAttempts}/3`);
        return {
            success: false,
            reason: remaining > 0
                ? `Invalid code. ${remaining} attempt(s) remaining.`
                : 'Too many failed attempts. Please request a new code.',
        };
    }

    // Correct code — mark as verified (do NOT increment attempts on success)
    await prisma.oTP.update({
        where: { id: otp.id },
        data: { verified: true },
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
