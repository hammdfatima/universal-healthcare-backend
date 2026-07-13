-- Convert dateOfBirth from timestamp to text (ISO) for encrypted PHI storage
ALTER TABLE "User"
  ALTER COLUMN "dateOfBirth" TYPE TEXT
  USING CASE
    WHEN "dateOfBirth" IS NULL THEN NULL
    ELSE to_char("dateOfBirth" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  END;

-- Reset emergency tokens; PIN + expiry are now required
DELETE FROM "EmergencyAccessToken";

ALTER TABLE "EmergencyAccessToken"
  ADD COLUMN "pinHash" TEXT NOT NULL,
  ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL,
  ADD COLUMN "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Append-only PHI / auth audit trail
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "patientUserId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_patientUserId_idx" ON "AuditLog"("patientUserId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");
