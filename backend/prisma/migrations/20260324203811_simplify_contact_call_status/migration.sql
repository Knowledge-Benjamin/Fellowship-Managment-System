/*
  Warnings:

  - The values [NOT_CALLED,CALLED,ATTENDED,UNREACHABLE] on the enum `ContactCallStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContactCallStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'NOT_CONFIRMED');
ALTER TABLE "public"."MobilizationContact" ALTER COLUMN "callStatus" DROP DEFAULT;
ALTER TABLE "MobilizationContact" ALTER COLUMN "callStatus" TYPE "ContactCallStatus_new" USING ("callStatus"::text::"ContactCallStatus_new");
ALTER TYPE "ContactCallStatus" RENAME TO "ContactCallStatus_old";
ALTER TYPE "ContactCallStatus_new" RENAME TO "ContactCallStatus";
DROP TYPE "public"."ContactCallStatus_old";
ALTER TABLE "MobilizationContact" ALTER COLUMN "callStatus" SET DEFAULT 'PENDING';
COMMIT;

-- DropIndex
DROP INDEX "BringOnePledge_eventId_idx";

-- AlterTable
ALTER TABLE "MobilizationContact" ALTER COLUMN "callStatus" SET DEFAULT 'PENDING';
