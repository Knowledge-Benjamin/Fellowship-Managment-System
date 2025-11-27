const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seed...');

    // Create initial regions
    console.log('Creating regions...');
    const regions = await Promise.all([
        prisma.region.create({
            data: { name: 'Central' },
        }),
        prisma.region.create({
            data: { name: 'Kikoni' },
        }),
        prisma.region.create({
            data: { name: 'Kikumi kikumi' },
        }),
    ]);

    console.log(`✓ Created ${regions.length} regions`);

    // Create manager account with Central region
    console.log('Creating manager account...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const manager = await prisma.member.create({
        data: {
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
    console.log(`  Password: admin123`);
    console.log(`  Fellowship Number: ${manager.fellowshipNumber}`);
    console.log(`  Region: Central`);

    // Create system tags
    console.log('Creating system tags...');
    const checkInVolunteerTag = await prisma.tag.create({
        data: {
            name: 'CHECK_IN_VOLUNTEER',
            description: 'Temporary access for event check-in volunteers',
            type: 'SYSTEM',
            color: '#f59e0b',
            isSystem: true,
        },
    });

    console.log('✓ Created system tag: CHECK_IN_VOLUNTEER');

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
