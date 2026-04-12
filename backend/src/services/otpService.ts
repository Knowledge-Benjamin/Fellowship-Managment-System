import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export const generateOTP = (): string => {
    return crypto.randomInt(100000, 999999).toString();
};

export const createOTP = async (prisma: PrismaClient, memberId: string): Promise<string> => {
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.oTP.updateMany({
        where: { memberId, verified: false },
        data: { verified: true },
    });

    await prisma.oTP.create({
        data: { memberId, code, expiresAt },
    });

    console.log(`[OTP] Created OTP for member ${memberId}, expires at ${expiresAt.toISOString()}`);
    return code;
};

export const verifyOTP = async (
    prisma: PrismaClient,
    memberId: string,
    code: string
): Promise<{ success: boolean; reason?: string }> => {
    const otp = await prisma.oTP.findFirst({
        where: { memberId, verified: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
        return { success: false, reason: 'No active OTP found. Please request a new code.' };
    }

    if (otp.attempts >= 3) {
        await prisma.oTP.update({ where: { id: otp.id }, data: { verified: true } });
        return { success: false, reason: 'Too many failed attempts. Please request a new code.' };
    }

    if (otp.code !== code) {
        const newAttempts = otp.attempts + 1;
        const remaining = 3 - newAttempts;
        await prisma.oTP.update({
            where: { id: otp.id },
            data: { attempts: { increment: 1 }, ...(remaining === 0 && { verified: true }) },
        });
        return {
            success: false,
            reason: remaining > 0
                ? `Invalid code. ${remaining} attempt(s) remaining.`
                : 'Too many failed attempts. Please request a new code.',
        };
    }

    await prisma.oTP.update({ where: { id: otp.id }, data: { verified: true } });
    console.log(`[OTP] Successfully verified OTP for member ${memberId}`);
    return { success: true };
};

export const hasActiveOTP = async (prisma: PrismaClient, memberId: string): Promise<boolean> => {
    const otp = await prisma.oTP.findFirst({
        where: { memberId, verified: false, expiresAt: { gt: new Date() } },
    });
    return !!otp;
};

export const cleanupExpiredOTPs = async (prisma: PrismaClient): Promise<number> => {
    const result = await prisma.oTP.updateMany({
        where: { expiresAt: { lt: new Date() }, verified: false },
        data: { verified: true },
    });
    console.log(`[OTP CLEANUP] Marked ${result.count} expired OTPs as verified`);
    return result.count;
};

export default { generateOTP, createOTP, verifyOTP, hasActiveOTP, cleanupExpiredOTPs };
