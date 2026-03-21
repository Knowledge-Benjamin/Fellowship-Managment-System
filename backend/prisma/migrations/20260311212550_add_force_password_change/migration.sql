-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiresReauth" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PendingMember" ADD COLUMN     "classificationTagName" TEXT;

-- CreateIndex
CREATE INDEX "Member_fullName_idx" ON "Member"("fullName");
