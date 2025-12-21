-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('SALVATION', 'REDEDICATION', 'BAPTISM_INTEREST', 'PRAYER_REQUEST');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'FIRST_CONTACT_MADE', 'ONGOING_DISCIPLESHIP', 'BAPTIZED', 'INTEGRATED', 'LOST_CONTACT');

-- CreateTable
CREATE TABLE "Salvation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "guestEmail" TEXT,
    "counselorId" TEXT,
    "decisionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisionType" "DecisionType" NOT NULL DEFAULT 'SALVATION',
    "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "firstContactDate" TIMESTAMP(3),
    "baptismInterest" BOOLEAN NOT NULL DEFAULT false,
    "baptismDate" TIMESTAMP(3),
    "assignedToSmallGroup" BOOLEAN NOT NULL DEFAULT false,
    "smallGroupName" TEXT,
    "notes" TEXT,
    "testimony" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Salvation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Salvation_eventId_idx" ON "Salvation"("eventId");

-- CreateIndex
CREATE INDEX "Salvation_memberId_idx" ON "Salvation"("memberId");

-- CreateIndex
CREATE INDEX "Salvation_decisionDate_idx" ON "Salvation"("decisionDate");

-- CreateIndex
CREATE INDEX "Salvation_followUpStatus_idx" ON "Salvation"("followUpStatus");

-- AddForeignKey
ALTER TABLE "Salvation" ADD CONSTRAINT "Salvation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salvation" ADD CONSTRAINT "Salvation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salvation" ADD CONSTRAINT "Salvation_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
