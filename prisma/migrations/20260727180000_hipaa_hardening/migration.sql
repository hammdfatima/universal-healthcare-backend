-- HIPAA hardening: durable lockout, consent, sessions, retention, breach
-- Also enforce append-only audit logs at the database level.

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "ConsentType" AS ENUM (
    'TERMS_OF_USE',
    'PRIVACY_POLICY',
    'EMERGENCY_ACCESS',
    'NOTICE_OF_PRIVACY_PRACTICES'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ConsentRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ConsentType" NOT NULL,
  "version" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConsentRecord_userId_type_idx" ON "ConsentRecord"("userId", "type");
CREATE INDEX IF NOT EXISTS "ConsentRecord_createdAt_idx" ON "ConsentRecord"("createdAt");

DO $$ BEGIN
  ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_sessionId_key" ON "AuthSession"("sessionId");
CREATE INDEX IF NOT EXISTS "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");

DO $$ BEGIN
  ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "RetentionRule" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "retentionDays" INTEGER NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RetentionRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RetentionRule_category_key" ON "RetentionRule"("category");

INSERT INTO "RetentionRule" ("id", "category", "retentionDays", "description")
VALUES
  ('retention_audit', 'audit_logs', 2190, 'HIPAA minimum 6-year audit retention'),
  ('retention_otp', 'otp_tokens', 30, 'Short-lived OTP and reset token purge'),
  ('retention_sessions', 'auth_sessions', 90, 'Revoked/expired session cleanup')
ON CONFLICT ("category") DO NOTHING;

DO $$ BEGIN
  CREATE TYPE "BreachStatus" AS ENUM ('open', 'contained', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "BreachIncident" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "status" "BreachStatus" NOT NULL DEFAULT 'open',
  "affectedCountEst" INTEGER NOT NULL DEFAULT 0,
  "dataCategories" TEXT[],
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hipaa60dDeadline" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BreachIncident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BreachIncident_status_detectedAt_idx" ON "BreachIncident"("status", "detectedAt");

DO $$ BEGIN
  ALTER TABLE "BreachIncident"
  ADD CONSTRAINT "BreachIncident_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Append-only audit log enforcement (HIPAA §3.1)
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON "AuditLog";
DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";

CREATE TRIGGER audit_log_no_update
BEFORE UPDATE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER audit_log_no_delete
BEFORE DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
