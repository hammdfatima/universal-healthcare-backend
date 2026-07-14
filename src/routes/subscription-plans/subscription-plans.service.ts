import type { SubscriptionPlan } from '~/generated/prisma'
import { ensureCurrencyPrice } from '~/lib/currency'
import { HttpError } from '~/lib/error'
import { syncHouseholdAccessAfterPlanChange } from '~/lib/household-access'
import prisma from '~/lib/prisma'
import {
  archiveStripeSubscriptionPlan,
  createStripeSubscriptionPlan,
  updateStripeSubscriptionPlan,
} from '~/lib/stripe'

type SubscriptionPlanInput = {
  planName: string
  price: string
  billingCycle: 'monthly' | 'yearly'
  features: string[]
  memberLimit: number
  allowsPets: boolean
}

function normalizeInput(input: SubscriptionPlanInput): SubscriptionPlanInput {
  return {
    planName: input.planName.trim(),
    price: ensureCurrencyPrice(input.price.trim()),
    billingCycle: input.billingCycle,
    features: input.features.map(feature => feature.trim()).filter(Boolean),
    memberLimit: Math.max(0, Math.floor(input.memberLimit)),
    allowsPets: Boolean(input.allowsPets),
  }
}

function toSubscriptionPlanResponse(plan: SubscriptionPlan) {
  return {
    id: plan.id,
    planName: plan.planName,
    price: ensureCurrencyPrice(plan.price),
    billingCycle: plan.billingCycle,
    features: plan.features,
    memberLimit: plan.memberLimit,
    allowsPets: plan.allowsPets,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  }
}

export async function listSubscriptionPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return plans.map(toSubscriptionPlanResponse)
}

export async function createSubscriptionPlan(input: SubscriptionPlanInput) {
  const normalized = normalizeInput(input)

  if (normalized.features.length === 0) {
    throw new HttpError('At least one feature is required.', 400)
  }

  const stripePlan = await createStripeSubscriptionPlan(normalized)

  const plan = await prisma.subscriptionPlan.create({
    data: {
      ...normalized,
      stripeProductId: stripePlan.productId,
      stripePriceId: stripePlan.priceId,
    },
  })

  return toSubscriptionPlanResponse(plan)
}

export async function updateSubscriptionPlan(id: string, input: SubscriptionPlanInput) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } })

  if (!existing) {
    throw new HttpError('Subscription plan not found.', 404)
  }

  const normalized = normalizeInput(input)

  if (normalized.features.length === 0) {
    throw new HttpError('At least one feature is required.', 400)
  }

  const stripePlan = await updateStripeSubscriptionPlan(existing, normalized)

  const plan = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...normalized,
      stripeProductId: stripePlan.productId,
      stripePriceId: stripePlan.priceId,
    },
  })

  const seatConfigChanged =
    existing.memberLimit !== normalized.memberLimit ||
    existing.allowsPets !== normalized.allowsPets

  if (seatConfigChanged) {
    const subscribers = await prisma.userSubscription.findMany({
      where: {
        subscriptionPlanId: plan.id,
        user: { managedByOwnerId: null },
      },
      select: { userId: true },
    })

    await Promise.all(
      subscribers.map(subscriber => syncHouseholdAccessAfterPlanChange(subscriber.userId))
    )
  }

  return toSubscriptionPlanResponse(plan)
}

export async function deleteSubscriptionPlan(id: string) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } })

  if (!existing) {
    throw new HttpError('Subscription plan not found.', 404)
  }

  const [subscriptionCount, paymentCount] = await Promise.all([
    prisma.userSubscription.count({ where: { subscriptionPlanId: id } }),
    prisma.payment.count({ where: { subscriptionPlanId: id } }),
  ])

  if (subscriptionCount > 0) {
    throw new HttpError(
      'There are active subscriptions on this plan. You cannot delete this plan.',
      409
    )
  }

  if (paymentCount > 0) {
    throw new HttpError(
      'This plan has payment history and cannot be deleted.',
      409
    )
  }

  await archiveStripeSubscriptionPlan(existing.stripeProductId, existing.stripePriceId)
  await prisma.subscriptionPlan.delete({ where: { id } })
}
