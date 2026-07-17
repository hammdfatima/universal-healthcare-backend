-- Preserve date of birth for managed family-member profiles while removing it
-- from primary user profiles.
ALTER TABLE "FamilyMember" ADD COLUMN "dateOfBirth" TEXT;

UPDATE "FamilyMember" AS fm
SET "dateOfBirth" = u."dateOfBirth"
FROM "User" AS u
WHERE u."id" = fm."memberUserId";

ALTER TABLE "User" DROP COLUMN "dateOfBirth";
