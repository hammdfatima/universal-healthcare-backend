-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "sex" TEXT,
    "color" TEXT,
    "dateOfBirth" TEXT,
    "microchipId" TEXT,
    "veterinaryClinic" TEXT,
    "veterinaryPhone" TEXT,
    "veterinaryRecords" TEXT,
    "medicationsJson" TEXT NOT NULL DEFAULT '[]',
    "allergiesJson" TEXT NOT NULL DEFAULT '[]',
    "vaccinationsJson" TEXT NOT NULL DEFAULT '[]',
    "emergencyContactFamilyMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pet_ownerId_idx" ON "Pet"("ownerId");

-- CreateIndex
CREATE INDEX "Pet_emergencyContactFamilyMemberId_idx" ON "Pet"("emergencyContactFamilyMemberId");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_emergencyContactFamilyMemberId_fkey" FOREIGN KEY ("emergencyContactFamilyMemberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
