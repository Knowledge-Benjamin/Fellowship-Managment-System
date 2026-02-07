-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('NEW_MEMBER', 'LEGACY_IMPORT', 'TRANSFER', 'READMISSION');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "registrationMode" "RegistrationMode" NOT NULL DEFAULT 'NEW_MEMBER';
