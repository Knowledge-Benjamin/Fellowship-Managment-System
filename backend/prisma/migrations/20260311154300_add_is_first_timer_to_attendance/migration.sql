-- AlterTable
-- Add isFirstTimer column to Attendance to record first-timer status at check-in time.
-- Existing rows default to false (unknown/not a first-timer), which is the safe default.
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "isFirstTimer" BOOLEAN NOT NULL DEFAULT false;
