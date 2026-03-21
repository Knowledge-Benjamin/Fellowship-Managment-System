-- CreateTable
CREATE TABLE "FamilyTransferRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fromFamilyId" TEXT NOT NULL,
    "toFamilyId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_ORIGIN',
    "reason" TEXT,
    "originApproverId" TEXT,
    "originReviewNote" TEXT,
    "originReviewedAt" TIMESTAMP(3),
    "destApproverId" TEXT,
    "destReviewNote" TEXT,
    "destReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyTransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyTransferRequest_memberId_idx" ON "FamilyTransferRequest"("memberId");

-- CreateIndex
CREATE INDEX "FamilyTransferRequest_fromFamilyId_idx" ON "FamilyTransferRequest"("fromFamilyId");

-- CreateIndex
CREATE INDEX "FamilyTransferRequest_toFamilyId_idx" ON "FamilyTransferRequest"("toFamilyId");

-- CreateIndex
CREATE INDEX "FamilyTransferRequest_status_idx" ON "FamilyTransferRequest"("status");

-- AddForeignKey
ALTER TABLE "FamilyTransferRequest" ADD CONSTRAINT "FamilyTransferRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTransferRequest" ADD CONSTRAINT "FamilyTransferRequest_fromFamilyId_fkey" FOREIGN KEY ("fromFamilyId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTransferRequest" ADD CONSTRAINT "FamilyTransferRequest_toFamilyId_fkey" FOREIGN KEY ("toFamilyId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTransferRequest" ADD CONSTRAINT "FamilyTransferRequest_originApproverId_fkey" FOREIGN KEY ("originApproverId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTransferRequest" ADD CONSTRAINT "FamilyTransferRequest_destApproverId_fkey" FOREIGN KEY ("destApproverId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
