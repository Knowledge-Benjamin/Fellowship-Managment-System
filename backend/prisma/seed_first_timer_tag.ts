import { PrismaClient, TagType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFirstTimerTag() {
    console.log('🌱 Seeding PENDING_FIRST_ATTENDANCE system tag...');

    try {
        // Check if tag already exists
        const existing = await prisma.tag.findUnique({
            where: { name: 'PENDING_FIRST_ATTENDANCE' },
        });

        if (existing) {
            console.log('✅ PENDING_FIRST_ATTENDANCE tag already exists');
            console.log(`   ID: ${existing.id}`);
            console.log(`   Type: ${existing.type}`);
            console.log(`   System: ${existing.isSystem}`);
            return;
        }

        // Create the system tag
        const tag = await prisma.tag.create({
            data: {
                name: 'PENDING_FIRST_ATTENDANCE',
                description: 'Member awaiting their first event attendance. Auto-assigned for new registrations and auto-removed after first check-in.',
                type: TagType.SYSTEM,
                color: '#10b981', // Green color
                isSystem: true,
                showOnRegistration: false,
            },
        });

        console.log('✅ Created PENDING_FIRST_ATTENDANCE tag');
        console.log(`   ID: ${tag.id}`);
        console.log(`   Color: ${tag.color}`);
        console.log('   This tag will be auto-assigned to new members and removed after first attendance');

    } catch (error) {
        console.error('❌ Error seeding tag:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedFirstTimerTag()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
