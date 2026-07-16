-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN "scheduledPlanId" TEXT;
ALTER TABLE "UserSubscription" ADD COLUMN "scheduledPlanChangeAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UserSubscription_scheduledPlanId_idx" ON "UserSubscription"("scheduledPlanId");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_scheduledPlanId_fkey" FOREIGN KEY ("scheduledPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
