import type { SubscriptionStatus, UserSubscription } from '~/generated/prisma'
import { USER_ROLES } from '~/config/roles'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'
import {
  constructStripeWebhookEvent,
  createSubscriptionCheckoutSession,
  getStripeClient,
} from '~/lib/stripe'
import type Stripe from 'stripe'

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing']

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'cancelled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete'
    default:
      return 'inactive'
  }
}

function toPlanSummary(plan: {
  id: string
  planName: string
  price: string
  billingCycle: 'monthly' | 'yearly'
  features: string[]
}) {
  return {
    id: plan.id,
    planName: plan.planName,
    price: plan.price,
    billingCycle: plan.billingCycle,
    features: plan.features,
  }
}

function toSubscriptionResponse(
  subscription: UserSubscription & {
    subscriptionPlan: {
      id: string
      planName: string
      price: string
      billingCycle: 'monthly' | 'yearly'
      features: string[]
    }
  }
) {
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    plan: toPlanSummary(subscription.subscriptionPlan),
  }
}

export function isSubscriptionActive(status: SubscriptionStatus) {
  return ACTIVE_STATUSES.includes(status)
}

async function getUserSubscriptionRecord(userId: string) {
  return prisma.userSubscription.findUnique({
    where: { userId },
    include: { subscriptionPlan: true },
  })
}

export async function getUserSubscription(userId: string) {
  const subscription = await getUserSubscriptionRecord(userId)

  return {
    subscription: subscription ? toSubscriptionResponse(subscription) : null,
    isActive: subscription ? isSubscriptionActive(subscription.status) : false,
  }
}

async function assertPatientUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  return user
}

export async function createCheckoutSession(userId: string, planId: string) {
  const user = await assertPatientUser(userId)

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })

  if (!plan) {
    throw new HttpError('Subscription plan not found.', 404)
  }

  if (!plan.stripePriceId) {
    throw new HttpError('This plan is not available for checkout yet.', 400)
  }

  const session = await createSubscriptionCheckoutSession({
    userId: user.id,
    userEmail: user.email,
    planId: plan.id,
    stripePriceId: plan.stripePriceId,
  })

  if (!session.url) {
    throw new HttpError('Failed to create checkout session.', 500)
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  }
}

async function upsertSubscriptionFromStripe(
  userId: string,
  planId: string,
  stripeSubscription: Stripe.Subscription
) {
  const status = mapStripeSubscriptionStatus(stripeSubscription.status)
  const currentPeriodEnd = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : null

  const subscription = await prisma.userSubscription.upsert({
    where: { userId },
    create: {
      userId,
      subscriptionPlanId: planId,
      stripeCustomerId:
        typeof stripeSubscription.customer === 'string'
          ? stripeSubscription.customer
          : stripeSubscription.customer.id,
      stripeSubscriptionId: stripeSubscription.id,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
    update: {
      subscriptionPlanId: planId,
      stripeCustomerId:
        typeof stripeSubscription.customer === 'string'
          ? stripeSubscription.customer
          : stripeSubscription.customer.id,
      stripeSubscriptionId: stripeSubscription.id,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
    include: { subscriptionPlan: true },
  })

  return toSubscriptionResponse(subscription)
}

export async function verifyCheckoutSession(userId: string, sessionId: string) {
  await assertPatientUser(userId)

  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  })

  if (session.metadata?.userId !== userId) {
    throw new HttpError('Checkout session does not belong to this user.', 403)
  }

  if (session.payment_status !== 'paid' || !session.subscription) {
    throw new HttpError('Checkout session is not completed yet.', 400)
  }

  const planId = session.metadata?.planId

  if (!planId) {
    throw new HttpError('Missing plan information on checkout session.', 400)
  }

  const stripeSubscription =
    typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription

  const subscription = await upsertSubscriptionFromStripe(
    userId,
    planId,
    stripeSubscription
  )

  return {
    subscription,
    isActive: isSubscriptionActive(subscription.status as SubscriptionStatus),
  }
}

export async function handleStripeWebhook(payload: string, signature: string) {
  const event = await constructStripeWebhookEvent(payload, signature)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const planId = session.metadata?.planId

      if (!userId || !planId || !session.subscription) {
        break
      }

      const stripe = getStripeClient()
      const stripeSubscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      )

      await upsertSubscriptionFromStripe(userId, planId, stripeSubscription)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const stripeSubscription = event.data.object as Stripe.Subscription
      const userId = stripeSubscription.metadata?.userId
      const planId = stripeSubscription.metadata?.planId

      if (!userId || !planId) {
        break
      }

      await upsertSubscriptionFromStripe(userId, planId, stripeSubscription)
      break
    }

    default:
      break
  }

  return { received: true }
}
