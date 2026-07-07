-- CreateTable
CREATE TABLE "EmergencyAccessToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyAccessToken_userId_key" ON "EmergencyAccessToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyAccessToken_token_key" ON "EmergencyAccessToken"("token");

-- CreateIndex
CREATE INDEX "EmergencyAccessToken_token_idx" ON "EmergencyAccessToken"("token");

-- AddForeignKey
ALTER TABLE "EmergencyAccessToken" ADD CONSTRAINT "EmergencyAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
