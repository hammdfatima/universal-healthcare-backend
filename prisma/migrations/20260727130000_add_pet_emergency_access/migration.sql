-- CreateTable
CREATE TABLE "PetEmergencyAccessToken" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetEmergencyAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PetEmergencyAccessToken_petId_key" ON "PetEmergencyAccessToken"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "PetEmergencyAccessToken_token_key" ON "PetEmergencyAccessToken"("token");

-- CreateIndex
CREATE INDEX "PetEmergencyAccessToken_token_idx" ON "PetEmergencyAccessToken"("token");

-- AddForeignKey
ALTER TABLE "PetEmergencyAccessToken" ADD CONSTRAINT "PetEmergencyAccessToken_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
