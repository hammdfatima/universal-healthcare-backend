-- CreateEnum
CREATE TYPE "public"."PlanKind" AS ENUM ('human', 'pet');

-- AlterTable
ALTER TABLE "public"."SubscriptionPlan"
ADD COLUMN "planKind" "public"."PlanKind" NOT NULL DEFAULT 'human',
ADD COLUMN "petLimit" INTEGER NOT NULL DEFAULT 0;

-- Human UHC memberships include pet profiles at no additional charge
UPDATE "public"."SubscriptionPlan"
SET "allowsPets" = true
WHERE "planKind" = 'human';
