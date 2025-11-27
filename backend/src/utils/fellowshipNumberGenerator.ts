import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generateFellowshipNumber = async (): Promise<string> => {
    // Find the last member with a fellowship number, regardless of role
    const lastMember = await prisma.member.findFirst({
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
        // If the last number doesn't match the format, start over or handle error
        // For safety/robustness, we'll return the start of the sequence if we can't parse the last one
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
