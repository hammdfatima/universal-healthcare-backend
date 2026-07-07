-- CreateTable
CREATE TABLE "ImagingResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "scanDate" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "fileResourceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagingResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImagingResult_userId_idx" ON "ImagingResult"("userId");

-- AddForeignKey
ALTER TABLE "ImagingResult" ADD CONSTRAINT "ImagingResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
