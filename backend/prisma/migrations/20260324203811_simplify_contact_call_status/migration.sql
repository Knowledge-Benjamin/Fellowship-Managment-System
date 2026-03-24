/*
  Warnings:

  - The values [NOT_CALLED,CALLED,ATTENDED,UNREACHABLE] on the enum `ContactCallStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- Step 1: Create the new enum type
CREATE TYPE "ContactCallStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'NOT_CONFIRMED');

-- Step 2: Drop default before altering column
ALTER TABLE "MobilizationContact" ALTER COLUMN "callStatus" DROP DEFAULT;

-- Step 3: Migrate existing data using CASE to map old values -> new values
--   NOT_CALLED -> PENDING
--   CALLED     -> PENDING  (still in progress / not resolved)
--   CONFIRMED  -> CONFIRMED
--   ATTENDED   -> CONFIRMED (they came, so confirmed)
--   UNREACHABLE -> NOT_CONFIRMED (won't be coming)
ALTER TABLE "MobilizationContact"
  ALTER COLUMN "callStatus" TYPE "ContactCallStatus_new"
  USING (
    CASE "callStatus"::text
      WHEN 'NOT_CALLED'   THEN 'PENDING'
      WHEN 'CALLED'       THEN 'PENDING'
      WHEN 'CONFIRMED'    THEN 'CONFIRMED'
      WHEN 'ATTENDED'     THEN 'CONFIRMED'
      WHEN 'UNREACHABLE'  THEN 'NOT_CONFIRMED'
      ELSE 'PENDING'
    END
  )::"ContactCallStatus_new";

-- Step 4: Rename old, rename new, drop old
ALTER TYPE "ContactCallStatus" RENAME TO "ContactCallStatus_old";
ALTER TYPE "ContactCallStatus_new" RENAME TO "ContactCallStatus";
DROP TYPE "ContactCallStatus_old";

-- Step 5: Restore default
ALTER TABLE "MobilizationContact" ALTER COLUMN "callStatus" SET DEFAULT 'PENDING';

-- DropIndex
DROP INDEX IF EXISTS "BringOnePledge_eventId_idx";

-- AlterTable (ensure default is set — idempotent)
ALTER TABLE "MobilizationContact" ALTER COLUMN "callStatus" SET DEFAULT 'PENDING';
