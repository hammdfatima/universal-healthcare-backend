-- AlterTable
ALTER TABLE "public"."SubscriptionPlan" ADD COLUMN     "allowsPets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memberLimit" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing plans from legacy name-based tiers
UPDATE "public"."SubscriptionPlan"
SET
  "memberLimit" = 6,
  "allowsPets" = true
WHERE LOWER("planName") LIKE '%family%';

UPDATE "public"."SubscriptionPlan"
SET
  "memberLimit" = 1,
  "allowsPets" = false
WHERE LOWER("planName") LIKE '%couple%';
