import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_Q8rAgxb2ToBy@ep-misty-truth-a4xrks1q.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    },
  },
});

async function main() {
  try {
     await prisma.$executeRawUnsafe('ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true;');
     await prisma.$executeRawUnsafe('ALTER TABLE "PendingMember" ADD COLUMN IF NOT EXISTS "classificationTagName" TEXT;');
     await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Member_fullName_idx" ON "Member"("fullName");');
     
     console.log("Successfully synced missing schema columns!");

    const trueCount = await prisma.member.count({
      where: { forcePasswordChange: true }
    });
    
    const falseCount = await prisma.member.count({
      where: { forcePasswordChange: false }
    });

    console.log(`Members with forcePasswordChange = true: ${trueCount}`);
    console.log(`Members with forcePasswordChange = false: ${falseCount}`);
  } catch (error) {
    console.error("Error connecting to neon db database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
