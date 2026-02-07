import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAcademicData() {
    console.log('Seeding academic periods...');

    const periods = [
        // 2025/2026
        { academicYear: '2025/2026', periodNumber: 1, periodName: 'First Period', startDate: new Date('2025-08-01'), endDate: new Date('2025-12-31') },
        { academicYear: '2025/2026', periodNumber: 2, periodName: 'Second Period', startDate: new Date('2026-01-16'), endDate: new Date('2026-05-31') },
        // 2026/2027
        { academicYear: '2026/2027', periodNumber: 1, periodName: 'First Period', startDate: new Date('2026-08-01'), endDate: new Date('2026-12-31') },
        { academicYear: '2026/2027', periodNumber: 2, periodName: 'Second Period', startDate: new Date('2027-01-16'), endDate: new Date('2027-05-31') },
        // 2027/2028
        { academicYear: '2027/2028', periodNumber: 1, periodName: 'First Period', startDate: new Date('2027-08-01'), endDate: new Date('2027-12-31') },
        { academicYear: '2027/2028', periodNumber: 2, periodName: 'Second Period', startDate: new Date('2028-01-16'), endDate: new Date('2028-05-31') },
    ];

    for (const period of periods) {
        await prisma.academicPeriod.upsert({
            where: {
                academicYear_periodNumber: {
                    academicYear: period.academicYear,
                    periodNumber: period.periodNumber,
                },
            },
            update: {},
            create: period,
        });
    }

    console.log(`✓ Seeded ${periods.length} academic periods`);

    // Create ALUMNI tag
    await prisma.tag.upsert({
        where: { name: 'ALUMNI' },
        update: {},
        create: {
            name: 'ALUMNI',
            description: 'Members who completed their course and continue attending fellowship',
            type: 'SYSTEM',
            color: '#8b5cf6',
            isSystem: true,
            showOnRegistration: false,
        },
    });

    console.log('✓ Created ALUMNI system tag');
}

seedAcademicData()
    .then(() => {
        console.log('✓ Academic data seeding completed successfully');
    })
    .catch((error) => {
        console.error('Error seeding academic data:', error);
        throw error;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
