-- AlterTable
ALTER TABLE "User" ADD COLUMN "medicalRecordShareWithAll" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MedicalRecordShare" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "granteeUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecordShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalRecordShare_ownerUserId_idx" ON "MedicalRecordShare"("ownerUserId");

-- CreateIndex
CREATE INDEX "MedicalRecordShare_granteeUserId_idx" ON "MedicalRecordShare"("granteeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecordShare_ownerUserId_granteeUserId_key" ON "MedicalRecordShare"("ownerUserId", "granteeUserId");

-- AddForeignKey
ALTER TABLE "MedicalRecordShare" ADD CONSTRAINT "MedicalRecordShare_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecordShare" ADD CONSTRAINT "MedicalRecordShare_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
