/*
  Warnings:

  - Added the required column `createdBy` to the `FamilyGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memberTagName` to the `FamilyGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FamilyGroup" ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "memberTagName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "FamilyGroup_createdBy_idx" ON "FamilyGroup"("createdBy");

-- AddForeignKey
ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
