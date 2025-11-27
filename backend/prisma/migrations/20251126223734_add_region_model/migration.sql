/*
  Warnings:

  - You are about to drop the column `residence` on the `Member` table. All the data in the column will be lost.
  - Added the required column `regionId` to the `Member` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "residence",
ADD COLUMN     "regionId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE INDEX "Region_name_idx" ON "Region"("name");

-- CreateIndex
CREATE INDEX "Member_regionId_idx" ON "Member"("regionId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
