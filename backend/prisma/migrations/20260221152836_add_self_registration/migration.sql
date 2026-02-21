-- CreateEnum
CREATE TYPE "PendingMemberStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "RegistrationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingMember" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "isMakerereStudent" BOOLEAN NOT NULL DEFAULT true,
    "registrationMode" "RegistrationMode" NOT NULL DEFAULT 'NEW_MEMBER',
    "regionId" TEXT,
    "collegeId" TEXT,
    "collegeSuggestion" TEXT,
    "courseId" TEXT,
    "courseSuggestion" TEXT,
    "initialYearOfStudy" INTEGER,
    "initialSemester" INTEGER,
    "residenceId" TEXT,
    "residenceSuggestion" TEXT,
    "hostelName" TEXT,
    "status" "PendingMemberStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationToken_token_key" ON "RegistrationToken"("token");

-- CreateIndex
CREATE INDEX "RegistrationToken_token_idx" ON "RegistrationToken"("token");

-- CreateIndex
CREATE INDEX "RegistrationToken_isActive_idx" ON "RegistrationToken"("isActive");

-- CreateIndex
CREATE INDEX "RegistrationToken_expiresAt_idx" ON "RegistrationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingMember_email_key" ON "PendingMember"("email");

-- CreateIndex
CREATE INDEX "PendingMember_email_idx" ON "PendingMember"("email");

-- CreateIndex
CREATE INDEX "PendingMember_status_idx" ON "PendingMember"("status");

-- CreateIndex
CREATE INDEX "PendingMember_tokenId_idx" ON "PendingMember"("tokenId");

-- AddForeignKey
ALTER TABLE "PendingMember" ADD CONSTRAINT "PendingMember_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "RegistrationToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingMember" ADD CONSTRAINT "PendingMember_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
