-- CreateTable
CREATE TABLE "CareProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "clinicDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareProvider_userId_idx" ON "CareProvider"("userId");

-- AddForeignKey
ALTER TABLE "CareProvider" ADD CONSTRAINT "CareProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
