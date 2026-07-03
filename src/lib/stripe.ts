import Stripe from 'stripe'

import type { BillingCycle } from '~/generated/prisma'
import { HttpError } from '~/lib/error'

let stripeClient: Stripe | null = null

export function getStripeClient() {
  const secretKey = Bun.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new HttpError('Stripe is not configured.', 500)
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }

  return stripeClient
}

export function parsePriceToCents(price: string) {
  const normalized = price.replace(/[^0-9.]/g, '')
  const amount = Number.parseFloat(normalized)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError('Invalid price format.', 400)
  }

  return Math.round(amount * 100)
}

function toStripeInterval(billingCycle: BillingCycle): Stripe.Price.Recurring.Interval {
  return billingCycle === 'yearly' ? 'year' : 'month'
}

type StripePlanInput = {
  planName: string
  price: string
  billingCycle: BillingCycle
  features: string[]
}

function buildStripeMetadata(input: StripePlanInput) {
  return {
    billing_cycle: input.billingCycle,
    features: JSON.stringify(input.features),
  }
}

export async function createStripeSubscriptionPlan(input: StripePlanInput) {
  const stripe = getStripeClient()
  const unitAmount = parsePriceToCents(input.price)

  const product = await stripe.products.create({
    name: input.planName,
    active: true,
    metadata: buildStripeMetadata(input),
  })

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: unitAmount,
    recurring: {
      interval: toStripeInterval(input.billingCycle),
    },
    metadata: {
      billing_cycle: input.billingCycle,
    },
  })

  return {
    productId: product.id,
    priceId: price.id,
  }
}

export async function updateStripeSubscriptionPlan(
  existing: {
    stripeProductId: string | null
    stripePriceId: string | null
    price: string
    billingCycle: BillingCycle
  },
  input: StripePlanInput
) {
  const stripe = getStripeClient()
  const unitAmount = parsePriceToCents(input.price)
  const billingChanged =
    existing.price.trim() !== input.price.trim() ||
    existing.billingCycle !== input.billingCycle

  let productId = existing.stripeProductId
  let priceId = existing.stripePriceId

  if (!productId) {
    const created = await createStripeSubscriptionPlan(input)
    return created
  }

  await stripe.products.update(productId, {
    name: input.planName,
    active: true,
    metadata: buildStripeMetadata(input),
  })

  if (!priceId || billingChanged) {
    const newPrice = await stripe.prices.create({
      product: productId,
      currency: 'usd',
      unit_amount: unitAmount,
      recurring: {
        interval: toStripeInterval(input.billingCycle),
      },
      metadata: {
        billing_cycle: input.billingCycle,
      },
    })

    priceId = newPrice.id

    if (existing.stripePriceId) {
      await stripe.prices.update(existing.stripePriceId, { active: false })
    }
  }

  return {
    productId,
    priceId,
  }
}

export async function archiveStripeSubscriptionPlan(
  stripeProductId: string | null,
  stripePriceId: string | null
) {
  if (!stripeProductId && !stripePriceId) {
    return
  }

  const stripe = getStripeClient()

  if (stripePriceId) {
    await stripe.prices.update(stripePriceId, { active: false })
  }

  if (stripeProductId) {
    await stripe.products.update(stripeProductId, { active: false })
  }
}

export function getFrontendUrl() {
  return Bun.env.FRONTEND_URL ?? 'http://localhost:3000'
}

export async function createSubscriptionCheckoutSession(input: {
  userId: string
  userEmail: string
  planId: string
  stripePriceId: string
}) {
  const stripe = getStripeClient()
  const frontendUrl = getFrontendUrl()

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: input.userEmail,
    line_items: [
      {
        price: input.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${frontendUrl}/onboarding/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/onboarding/subscription?cancelled=true`,
    metadata: {
      userId: input.userId,
      planId: input.planId,
    },
    subscription_data: {
      metadata: {
        userId: input.userId,
        planId: input.planId,
      },
    },
  })
}

export function constructStripeWebhookEvent(payload: string, signature: string) {
  const stripe = getStripeClient()
  const webhookSecret = Bun.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new HttpError('Stripe webhook is not configured.', 503)
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}
