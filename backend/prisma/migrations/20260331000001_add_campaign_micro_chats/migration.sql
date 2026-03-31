-- CreateTable
CREATE TABLE "CampaignMessage" (
    "id" TEXT NOT NULL,
    "mobilizationId" TEXT,
    "bringOneId" TEXT,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignMessage_mobilizationId_idx" ON "CampaignMessage"("mobilizationId");

-- CreateIndex
CREATE INDEX "CampaignMessage_bringOneId_idx" ON "CampaignMessage"("bringOneId");

-- CreateIndex
CREATE INDEX "CampaignMessage_senderId_idx" ON "CampaignMessage"("senderId");

-- CreateIndex
CREATE INDEX "CampaignMessage_isRead_idx" ON "CampaignMessage"("isRead");

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_mobilizationId_fkey" FOREIGN KEY ("mobilizationId") REFERENCES "MobilizationContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_bringOneId_fkey" FOREIGN KEY ("bringOneId") REFERENCES "BringOnePledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
