-- CreateTable
CREATE TABLE "HealthHistoryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "illnessName" TEXT NOT NULL,
    "diagnosisDate" TIMESTAMP(3) NOT NULL,
    "prescribedBy" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthHistoryEntry_userId_idx" ON "HealthHistoryEntry"("userId");

-- AddForeignKey
ALTER TABLE "HealthHistoryEntry" ADD CONSTRAINT "HealthHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
