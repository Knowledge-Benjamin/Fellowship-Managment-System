const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seed...');

    // Create initial regions
    console.log('Creating regions...');
    const regions = await Promise.all([
        prisma.region.upsert({
            where: { name: 'Central' },
            update: {},
            create: { name: 'Central' },
        }),
        prisma.region.upsert({
            where: { name: 'Kikoni' },
            update: {},
            create: { name: 'Kikoni' },
        }),
        prisma.region.upsert({
            where: { name: 'Kikumi kikumi' },
            update: {},
            create: { name: 'Kikumi kikumi' },
        }),
    ]);

    console.log(`✓ Created ${regions.length} regions`);

    // Create manager account with Central region
    console.log('Creating manager account...');
    const hashedPassword = await bcrypt.hash('Manager@Fellowship', 10);

    const manager = await prisma.member.upsert({
        where: { email: 'manager@fellowship.com' },
        update: {},
        create: {
            fullName: 'Fellowship Manager',
            email: 'manager@fellowship.com',
            phoneNumber: '+256700000000',
            password: hashedPassword,
            role: 'FELLOWSHIP_MANAGER',
            fellowshipNumber: 'AAA001',
            gender: 'MALE',
            regionId: regions[0].id, // Central region
        },
    });

    console.log('✓ Created manager account');
    console.log(`  Email: ${manager.email}`);
    console.log(`  Password: Manager@Fellowship`);
    console.log(`  Fellowship Number: ${manager.fellowshipNumber}`);
    console.log(`  Region: Central`);

    // Create system tags
    console.log('Creating system tags...');
    const checkInVolunteerTag = await prisma.tag.upsert({
        where: { name: 'CHECK_IN_VOLUNTEER' },
        update: {},
        create: {
            name: 'CHECK_IN_VOLUNTEER',
            description: 'Temporary access for event check-in volunteers',
            type: 'SYSTEM',
            color: '#f59e0b',
            isSystem: true,
        },
    });

    console.log('✓ Created system tag: CHECK_IN_VOLUNTEER');

    // Create Non-Resident region for non-Makerere students
    console.log('Creating Non-Resident region...');
    const nonResidentRegion = await prisma.region.upsert({
        where: { name: 'Non-Resident' },
        update: {},
        create: { name: 'Non-Resident' },
    });

    console.log('✓ Created Non-Resident region');

    // Create classification tags for student categorization
    console.log('Creating classification tags...');
    const classificationTags = await Promise.all([
        prisma.tag.upsert({
            where: { name: 'MAKERERE_STUDENT' },
            update: {},
            create: {
                name: 'MAKERERE_STUDENT',
                description: 'Active Makerere University student',
                type: 'SYSTEM',
                color: '#16a34a',
                isSystem: true,
                showOnRegistration: true,
            },
        }),
        prisma.tag.upsert({
            where: { name: 'ALUMNI' },
            update: {},
            create: {
                name: 'ALUMNI',
                description: 'Former Makerere student',
                type: 'SYSTEM',
                color: '#9333ea',
                isSystem: true,
                showOnRegistration: true,
            },
        }),
        prisma.tag.upsert({
            where: { name: 'OTHER_CAMPUS_STUDENT' },
            update: {},
            create: {
                name: 'OTHER_CAMPUS_STUDENT',
                description: 'Student from another university',
                type: 'SYSTEM',
                color: '#0284c7',
                isSystem: true,
                showOnRegistration: true,
            },
        }),
        prisma.tag.upsert({
            where: { name: 'OTHER' },
            update: {},
            create: {
                name: 'OTHER',
                description: 'Community member or other',
                type: 'SYSTEM',
                color: '#6b7280',
                isSystem: true,
                showOnRegistration: true,
            },
        }),
    ]);

    console.log(`✓ Created ${classificationTags.length} classification tags`);

    console.log('\nSeed completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
