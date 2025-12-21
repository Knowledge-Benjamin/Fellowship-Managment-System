/// <reference types="node" />

// Script to migrate existing string courses to the Course table
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting course data migration...');

    // 1. Get all members with a course string
    const membersWithCourse = await prisma.member.findMany({
        where: {
            course: {
                not: null,
            },
        },
    });

    console.log(`Found ${membersWithCourse.length} members with course strings.`);

    // 2. Iterate and process
    for (const member of membersWithCourse) {
        if (!member.course) continue;

        const courseName = member.course.trim();
        if (!courseName) continue;

        // Generate a simple code if one doesn't exist (First 3-4 letters + random if collision, but here we just try basic)
        // For migration purposes, we'll try to generate a code, but since we need uniqueness, we might need a strategy.
        // Strategy: Use first 4 chars of name as code base, uppercase. If taken, append number.

        // Check if course already exists by name
        let course = await prisma.course.findUnique({
            where: { name: courseName },
        });

        if (!course) {
            // Generate code
            let code = courseName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
            if (code.length < 2) code = 'CRS'; // Fallback

            // Check if code exists, if so, append random
            let codeAttempt = code;
            let counter = 1;
            while (await prisma.course.findUnique({ where: { code: codeAttempt } })) {
                codeAttempt = `${code}${counter}`;
                counter++;
            }

            console.log(`Creating course: "${courseName}" with code: "${codeAttempt}"`);

            course = await prisma.course.create({
                data: {
                    name: courseName,
                    code: codeAttempt,
                },
            });
        }

        // Link member to course
        await prisma.member.update({
            where: { id: member.id },
            data: {
                courseId: course.id,
            },
        });
    }

    console.log('Course migration completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
