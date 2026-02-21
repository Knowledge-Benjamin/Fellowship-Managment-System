-- CreateEnum
CREATE TYPE "EditRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProfileEditRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "EditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileEditRequest_memberId_idx" ON "ProfileEditRequest"("memberId");

-- CreateIndex
CREATE INDEX "ProfileEditRequest_status_idx" ON "ProfileEditRequest"("status");

-- CreateIndex
CREATE INDEX "ProfileEditRequest_reviewedBy_idx" ON "ProfileEditRequest"("reviewedBy");

-- AddForeignKey
ALTER TABLE "ProfileEditRequest" ADD CONSTRAINT "ProfileEditRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileEditRequest" ADD CONSTRAINT "ProfileEditRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
