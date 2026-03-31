-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_memberId_fkey";

-- AlterTable
ALTER TABLE "BringOneCampaign" ADD COLUMN     "manualTarget" INTEGER;

-- AlterTable
ALTER TABLE "MobilizationCampaign" ADD COLUMN     "manualTarget" INTEGER;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
