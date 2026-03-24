import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Mobilization Contacts ---");
    const mobContacts = await prisma.mobilizationContact.findMany({
        take: 3,
        include: { submittedBy: true }
    });
    console.log(JSON.stringify(mobContacts, null, 2));

    console.log("\n--- Bring One Pledges ---");
    const b1Pledges = await prisma.bringOnePledge.findMany({
        take: 3,
        include: { inviter: true }
    });
    console.log(JSON.stringify(b1Pledges, null, 2));
}

main().finally(() => prisma.$disconnect());
