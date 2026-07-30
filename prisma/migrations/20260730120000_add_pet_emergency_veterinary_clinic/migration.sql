-- AlterTable
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "emergencyVeterinaryClinic" TEXT;
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "emergencyVeterinaryPhone" TEXT;
