-- CreateEnum
CREATE TYPE "BringOneStatus" AS ENUM ('PLEDGED', 'PENDING_APPROVAL', 'JOINED', 'ATTENDED', 'LAPSED');

-- CreateEnum
CREATE TYPE "MobilizationStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContactCallStatus" AS ENUM ('NOT_CALLED', 'CALLED', 'CONFIRMED', 'ATTENDED', 'UNREACHABLE');

-- CreateTable
CREATE TABLE "BringOnePledge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone1" TEXT,
    "phone2" TEXT,
    "status" "BringOneStatus" NOT NULL DEFAULT 'PLEDGED',
    "pendingMemberId" TEXT,
    "memberId" TEXT,
    "matchedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BringOnePledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilizationCampaign" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "status" "MobilizationStatus" NOT NULL DEFAULT 'DRAFT',
    "maxContacts" INTEGER NOT NULL DEFAULT 20,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilizationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilizationContact" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "relationship" TEXT,
    "callStatus" "ContactCallStatus" NOT NULL DEFAULT 'NOT_CALLED',
    "calledById" TEXT,
    "calledAt" TIMESTAMP(3),
    "notes" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilizationContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BringOnePledge_eventId_idx" ON "BringOnePledge"("eventId");

-- CreateIndex
CREATE INDEX "BringOnePledge_inviterId_idx" ON "BringOnePledge"("inviterId");

-- CreateIndex
CREATE INDEX "BringOnePledge_email_idx" ON "BringOnePledge"("email");

-- CreateIndex
CREATE INDEX "BringOnePledge_phone1_idx" ON "BringOnePledge"("phone1");

-- CreateIndex
CREATE INDEX "BringOnePledge_phone2_idx" ON "BringOnePledge"("phone2");

-- CreateIndex
CREATE INDEX "BringOnePledge_status_idx" ON "BringOnePledge"("status");

-- CreateIndex
CREATE INDEX "MobilizationCampaign_eventId_idx" ON "MobilizationCampaign"("eventId");

-- CreateIndex
CREATE INDEX "MobilizationCampaign_status_idx" ON "MobilizationCampaign"("status");

-- CreateIndex
CREATE INDEX "MobilizationCampaign_createdBy_idx" ON "MobilizationCampaign"("createdBy");

-- CreateIndex
CREATE INDEX "MobilizationContact_campaignId_idx" ON "MobilizationContact"("campaignId");

-- CreateIndex
CREATE INDEX "MobilizationContact_submittedById_idx" ON "MobilizationContact"("submittedById");

-- CreateIndex
CREATE INDEX "MobilizationContact_phone_idx" ON "MobilizationContact"("phone");

-- CreateIndex
CREATE INDEX "MobilizationContact_callStatus_idx" ON "MobilizationContact"("callStatus");

-- AddForeignKey
ALTER TABLE "BringOnePledge" ADD CONSTRAINT "BringOnePledge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BringOnePledge" ADD CONSTRAINT "BringOnePledge_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilizationCampaign" ADD CONSTRAINT "MobilizationCampaign_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilizationCampaign" ADD CONSTRAINT "MobilizationCampaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilizationContact" ADD CONSTRAINT "MobilizationContact_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MobilizationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilizationContact" ADD CONSTRAINT "MobilizationContact_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilizationContact" ADD CONSTRAINT "MobilizationContact_calledById_fkey" FOREIGN KEY ("calledById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
