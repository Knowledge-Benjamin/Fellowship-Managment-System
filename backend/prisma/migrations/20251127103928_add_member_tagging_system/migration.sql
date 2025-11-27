-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('SYSTEM', 'CUSTOM');

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TagType" NOT NULL DEFAULT 'CUSTOM',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberTag" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedBy" TEXT,
    "removedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MemberTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_isSystem_idx" ON "Tag"("isSystem");

-- CreateIndex
CREATE INDEX "MemberTag_memberId_idx" ON "MemberTag"("memberId");

-- CreateIndex
CREATE INDEX "MemberTag_tagId_idx" ON "MemberTag"("tagId");

-- CreateIndex
CREATE INDEX "MemberTag_isActive_idx" ON "MemberTag"("isActive");

-- CreateIndex
CREATE INDEX "MemberTag_expiresAt_idx" ON "MemberTag"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemberTag_memberId_tagId_isActive_key" ON "MemberTag"("memberId", "tagId", "isActive");

-- AddForeignKey
ALTER TABLE "MemberTag" ADD CONSTRAINT "MemberTag_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTag" ADD CONSTRAINT "MemberTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTag" ADD CONSTRAINT "MemberTag_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTag" ADD CONSTRAINT "MemberTag_removedBy_fkey" FOREIGN KEY ("removedBy") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
