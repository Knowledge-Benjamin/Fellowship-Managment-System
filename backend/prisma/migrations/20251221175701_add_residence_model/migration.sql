-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "hostelName" TEXT,
ADD COLUMN     "residenceId" TEXT;

-- CreateTable
CREATE TABLE "Residence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HALL',
    "regionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Residence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Residence_name_key" ON "Residence"("name");

-- CreateIndex
CREATE INDEX "Residence_name_idx" ON "Residence"("name");

-- CreateIndex
CREATE INDEX "Residence_regionId_idx" ON "Residence"("regionId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Residence" ADD CONSTRAINT "Residence_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
