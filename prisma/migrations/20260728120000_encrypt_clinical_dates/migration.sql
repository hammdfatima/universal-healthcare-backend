-- Encrypt clinical dates: convert DateTime columns to TEXT (ISO) so AES-256-GCM
-- ciphertext can be stored. Run `bun run scripts/encrypt-existing-phi.ts` after migrate.

ALTER TABLE "Medication"
  ALTER COLUMN "startDate" TYPE TEXT
  USING to_char(("startDate" AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

ALTER TABLE "Medication"
  ALTER COLUMN "endDate" TYPE TEXT
  USING CASE
    WHEN "endDate" IS NULL THEN NULL
    ELSE to_char(("endDate" AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  END;

ALTER TABLE "HealthHistoryEntry"
  ALTER COLUMN "diagnosisDate" TYPE TEXT
  USING to_char(("diagnosisDate" AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

ALTER TABLE "Vaccination"
  ALTER COLUMN "vaccinationDate" TYPE TEXT
  USING to_char(("vaccinationDate" AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

ALTER TABLE "LabResult"
  ALTER COLUMN "testDate" TYPE TEXT
  USING to_char(("testDate" AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

ALTER TABLE "ImagingResult"
  ALTER COLUMN "scanDate" TYPE TEXT
  USING to_char(("scanDate" AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
