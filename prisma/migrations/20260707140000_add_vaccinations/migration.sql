-- CreateTable
CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "prescribedBy" TEXT NOT NULL,
    "administeredBy" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "vaccinationDate" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vaccination_userId_idx" ON "Vaccination"("userId");

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
