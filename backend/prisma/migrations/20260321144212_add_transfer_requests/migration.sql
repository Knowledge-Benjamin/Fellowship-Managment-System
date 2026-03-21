-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING_ORIGIN', 'PENDING_DESTINATION', 'REJECTED_BY_ORIGIN', 'REJECTED_BY_DESTINATION', 'COMPLETED');

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fromRegionId" TEXT NOT NULL,
    "toRegionId" TEXT NOT NULL,
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

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferRequest_memberId_idx" ON "TransferRequest"("memberId");

-- CreateIndex
CREATE INDEX "TransferRequest_fromRegionId_idx" ON "TransferRequest"("fromRegionId");

-- CreateIndex
CREATE INDEX "TransferRequest_toRegionId_idx" ON "TransferRequest"("toRegionId");

-- CreateIndex
CREATE INDEX "TransferRequest_status_idx" ON "TransferRequest"("status");

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_fromRegionId_fkey" FOREIGN KEY ("fromRegionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_toRegionId_fkey" FOREIGN KEY ("toRegionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_originApproverId_fkey" FOREIGN KEY ("originApproverId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_destApproverId_fkey" FOREIGN KEY ("destApproverId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
