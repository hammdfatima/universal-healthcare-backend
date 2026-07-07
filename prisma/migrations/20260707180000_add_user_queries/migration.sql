-- CreateTable
CREATE TABLE "UserQuery" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserQuery_isResolved_idx" ON "UserQuery"("isResolved");

-- CreateIndex
CREATE INDEX "UserQuery_createdAt_idx" ON "UserQuery"("createdAt");

-- AddForeignKey
ALTER TABLE "UserQuery" ADD CONSTRAINT "UserQuery_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
