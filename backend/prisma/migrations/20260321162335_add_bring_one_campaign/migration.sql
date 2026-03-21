/*
  Bring One Campaign — Migration
  Changes:
  - BringOnePledge.eventId replaced with campaignId (FK → BringOneCampaign)
    and a new eventId added (FK → Event) — so pledges link to both the
    standing config AND the specific event.
  - New BringOneCampaign table: fellowship-level standing config (no per-event).
  - All changes are safe: BringOnePledge was created in the previous migration
    with no production data.
*/

-- DropForeignKey
ALTER TABLE "BringOnePledge" DROP CONSTRAINT "BringOnePledge_eventId_fkey";

-- DropIndex
DROP INDEX "BringOnePledge_eventId_idx";

-- AlterTable (drop old eventId, add campaignId + new eventId)
ALTER TABLE "BringOnePledge" DROP COLUMN "eventId",
ADD COLUMN     "campaignId" TEXT NOT NULL DEFAULT 'placeholder',
ADD COLUMN     "eventId"    TEXT NOT NULL DEFAULT 'placeholder';

-- Remove the temporary defaults (columns now exist, safe to drop defaults)
ALTER TABLE "BringOnePledge" ALTER COLUMN "campaignId" DROP DEFAULT;
ALTER TABLE "BringOnePledge" ALTER COLUMN "eventId"    DROP DEFAULT;

-- CreateTable
CREATE TABLE "BringOneCampaign" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "minPledges"  INTEGER NOT NULL DEFAULT 1,
    "isActive"    BOOLEAN NOT NULL DEFAULT false,
    "createdBy"   TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BringOneCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BringOneCampaign_isActive_idx" ON "BringOneCampaign"("isActive");

-- CreateIndex
CREATE INDEX "BringOneCampaign_createdBy_idx" ON "BringOneCampaign"("createdBy");

-- CreateIndex
CREATE INDEX "BringOnePledge_campaignId_idx" ON "BringOnePledge"("campaignId");

-- CreateIndex (re-add eventId index on pledges, now as a simple index)
CREATE INDEX "BringOnePledge_eventId_idx" ON "BringOnePledge"("eventId");

-- AddForeignKey
ALTER TABLE "BringOneCampaign" ADD CONSTRAINT "BringOneCampaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BringOnePledge" ADD CONSTRAINT "BringOnePledge_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BringOneCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BringOnePledge" ADD CONSTRAINT "BringOnePledge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
