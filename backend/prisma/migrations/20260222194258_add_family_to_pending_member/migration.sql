-- AlterTable
ALTER TABLE "PendingMember" ADD COLUMN     "familyId" TEXT;

-- AddForeignKey
ALTER TABLE "PendingMember" ADD CONSTRAINT "PendingMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
