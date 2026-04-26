/*
  Warnings:

  - Changed the type of `type` on the `Event` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransportNeed" AS ENUM ('NEEDS_TRANSPORT', 'DOES_NOT_NEED_TRANSPORT', 'PENDING');

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- AlterTable
ALTER TABLE "MobilizationContact" ADD COLUMN     "location" TEXT,
ADD COLUMN     "transportNeed" "TransportNeed" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "ServiceType";
