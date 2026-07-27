-- AlterTable
ALTER TABLE "Pet"
ADD COLUMN "profileImage" TEXT,
ADD COLUMN "weight" TEXT,
ADD COLUMN "ownerName" TEXT,
ADD COLUMN "ownerPhone" TEXT,
ADD COLUMN "ownerEmail" TEXT,
ADD COLUMN "medicalConditionsJson" TEXT NOT NULL DEFAULT '[]';
