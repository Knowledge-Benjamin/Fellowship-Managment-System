-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "showOnRegistration" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Tag_showOnRegistration_idx" ON "Tag"("showOnRegistration");
