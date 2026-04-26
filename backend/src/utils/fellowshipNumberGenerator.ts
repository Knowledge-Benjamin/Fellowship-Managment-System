import { Prisma } from '@prisma/client';

/**
 * Generates the next fellowship number using the provided transaction/prisma client.
 * MUST receive the tenant-scoped prisma/tx client — never uses a singleton.
 */
export const generateFellowshipNumber = async (
    prismaOrTx: Prisma.TransactionClient | { member: { findFirst: Function } }
): Promise<string> => {
    // Find the last member with a fellowship number
    const lastMember = await (prismaOrTx as any).member.findFirst({
        orderBy: {
            fellowshipNumber: 'desc',
        },
        select: {
            fellowshipNumber: true,
        },
    });

    if (!lastMember) {
        return 'AAA001';
    }

    const lastNumber = lastMember.fellowshipNumber;

    // Ensure the number matches the expected format (3 letters, 3 digits)
    const match = lastNumber.match(/^([A-Z]{3})(\d{3})$/);

    if (!match) {
        // If the last number doesn't match the format, start from beginning
        return 'AAA001';
    }

    const letters = match[1];
    const digits = parseInt(match[2]);

    if (digits < 999) {
        // Simple increment: AAA001 -> AAA002
        return `${letters}${String(digits + 1).padStart(3, '0')}`;
    } else {
        // Wrap around: AAA999 -> AAB001
        let newLetters = letters.split('');
        let carry = true;

        for (let i = 2; i >= 0; i--) {
            if (carry) {
                if (newLetters[i] === 'Z') {
                    newLetters[i] = 'A';
                    carry = true;
                } else {
                    newLetters[i] = String.fromCharCode(newLetters[i].charCodeAt(0) + 1);
                    carry = false;
                }
            }
        }

        return `${newLetters.join('')}001`;
    }
};
