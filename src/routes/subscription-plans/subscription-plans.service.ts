import type { SubscriptionPlan } from '~/generated/prisma'
import { HttpError } from '~/lib/error'
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
}

function normalizeInput(input: SubscriptionPlanInput): SubscriptionPlanInput {
  return {
    planName: input.planName.trim(),
    price: input.price.trim(),
    billingCycle: input.billingCycle,
    features: input.features.map(feature => feature.trim()).filter(Boolean),
  }
}

function toSubscriptionPlanResponse(plan: SubscriptionPlan) {
  return {
    id: plan.id,
    planName: plan.planName,
    price: plan.price,
    billingCycle: plan.billingCycle,
    features: plan.features,
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

  return toSubscriptionPlanResponse(plan)
}

export async function deleteSubscriptionPlan(id: string) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } })

  if (!existing) {
    throw new HttpError('Subscription plan not found.', 404)
  }

  await archiveStripeSubscriptionPlan(existing.stripeProductId, existing.stripePriceId)
  await prisma.subscriptionPlan.delete({ where: { id } })
}
