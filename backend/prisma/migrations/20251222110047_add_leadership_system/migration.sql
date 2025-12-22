/*
  Warnings:

  - A unique constraint covering the columns `[regionalHeadId]` on the table `Region` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "regionalHeadId" TEXT;

-- CreateTable
CREATE TABLE "FamilyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "familyHeadId" TEXT,
    "assistantId" TEXT,
    "meetingDayLocked" BOOLEAN NOT NULL DEFAULT false,
    "meetingDay" TEXT,
    "meetingTimeLocked" BOOLEAN NOT NULL DEFAULT false,
    "meetingTime" TEXT,
    "meetingVenueLocked" BOOLEAN NOT NULL DEFAULT false,
    "meetingVenue" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistryTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderTagName" TEXT NOT NULL,
    "memberTagName" TEXT NOT NULL,
    "leaderId" TEXT,
    "assistantId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinistryTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistryTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "MinistryTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMeeting" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "topic" TEXT,
    "notes" TEXT,
    "attendees" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistrySchedule" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "memberIds" TEXT[],
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinistrySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyGroup_regionId_idx" ON "FamilyGroup"("regionId");

-- CreateIndex
CREATE INDEX "FamilyGroup_familyHeadId_idx" ON "FamilyGroup"("familyHeadId");

-- CreateIndex
CREATE INDEX "FamilyMember_familyId_idx" ON "FamilyMember"("familyId");

-- CreateIndex
CREATE INDEX "FamilyMember_memberId_idx" ON "FamilyMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_familyId_memberId_isActive_key" ON "FamilyMember"("familyId", "memberId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MinistryTeam_name_key" ON "MinistryTeam"("name");

-- CreateIndex
CREATE INDEX "MinistryTeam_name_idx" ON "MinistryTeam"("name");

-- CreateIndex
CREATE INDEX "MinistryTeam_leaderId_idx" ON "MinistryTeam"("leaderId");

-- CreateIndex
CREATE INDEX "MinistryTeam_createdBy_idx" ON "MinistryTeam"("createdBy");

-- CreateIndex
CREATE INDEX "MinistryTeamMember_teamId_idx" ON "MinistryTeamMember"("teamId");

-- CreateIndex
CREATE INDEX "MinistryTeamMember_memberId_idx" ON "MinistryTeamMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MinistryTeamMember_teamId_memberId_isActive_key" ON "MinistryTeamMember"("teamId", "memberId", "isActive");

-- CreateIndex
CREATE INDEX "FamilyMeeting_familyId_idx" ON "FamilyMeeting"("familyId");

-- CreateIndex
CREATE INDEX "FamilyMeeting_date_idx" ON "FamilyMeeting"("date");

-- CreateIndex
CREATE INDEX "MinistrySchedule_teamId_idx" ON "MinistrySchedule"("teamId");

-- CreateIndex
CREATE INDEX "MinistrySchedule_eventId_idx" ON "MinistrySchedule"("eventId");

-- CreateIndex
CREATE INDEX "MinistrySchedule_date_idx" ON "MinistrySchedule"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Region_regionalHeadId_key" ON "Region"("regionalHeadId");

-- CreateIndex
CREATE INDEX "Region_regionalHeadId_idx" ON "Region"("regionalHeadId");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_regionalHeadId_fkey" FOREIGN KEY ("regionalHeadId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_familyHeadId_fkey" FOREIGN KEY ("familyHeadId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryTeam" ADD CONSTRAINT "MinistryTeam_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryTeam" ADD CONSTRAINT "MinistryTeam_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryTeam" ADD CONSTRAINT "MinistryTeam_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryTeamMember" ADD CONSTRAINT "MinistryTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryTeamMember" ADD CONSTRAINT "MinistryTeamMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryTeamMember" ADD CONSTRAINT "MinistryTeamMember_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMeeting" ADD CONSTRAINT "FamilyMeeting_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMeeting" ADD CONSTRAINT "FamilyMeeting_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistrySchedule" ADD CONSTRAINT "MinistrySchedule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MinistryTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistrySchedule" ADD CONSTRAINT "MinistrySchedule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistrySchedule" ADD CONSTRAINT "MinistrySchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
