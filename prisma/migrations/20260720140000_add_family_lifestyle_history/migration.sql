-- CreateTable
CREATE TABLE "FamilyLifestyleHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "substancesData" TEXT NOT NULL,
    "familyHistoryData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyLifestyleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyLifestyleHistory_userId_key" ON "FamilyLifestyleHistory"("userId");

-- AddForeignKey
ALTER TABLE "FamilyLifestyleHistory" ADD CONSTRAINT "FamilyLifestyleHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
