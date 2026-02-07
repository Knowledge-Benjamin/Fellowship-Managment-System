/*
  Warnings:

  - You are about to drop the column `yearOfStudy` on the `Member` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "yearOfStudy",
ADD COLUMN     "initialSemester" INTEGER,
ADD COLUMN     "initialYearOfStudy" INTEGER,
ADD COLUMN     "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "periodName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicPeriod_startDate_endDate_idx" ON "AcademicPeriod"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriod_academicYear_periodNumber_key" ON "AcademicPeriod"("academicYear", "periodNumber");
