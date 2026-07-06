import type { SubscriptionStatus, UserSubscription } from '~/generated/prisma'
import { USER_ROLES } from '~/config/roles'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'
import {
  constructStripeWebhookEvent,
  createSubscriptionCheckoutSession,
  getFrontendUrl,
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

function getStripeSubscriptionPeriodEnd(
  stripeSubscription: Stripe.Subscription
): Date | null {
  const legacyPeriodEnd = (
    stripeSubscription as Stripe.Subscription & {
      current_period_end?: number | null
    }
  ).current_period_end

  const periodEnd =
    legacyPeriodEnd ?? stripeSubscription.items?.data?.[0]?.current_period_end

  if (!periodEnd) {
    return null
  }

  return new Date(periodEnd * 1000)
}

async function syncSubscriptionPeriodEndFromStripe(userId: string) {
  const subscription = await getUserSubscriptionRecord(userId)

  if (!subscription?.stripeSubscriptionId || subscription.currentPeriodEnd) {
    return subscription
  }

  const stripe = getStripeClient()
  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  )
  const currentPeriodEnd = getStripeSubscriptionPeriodEnd(stripeSubscription)

  if (!currentPeriodEnd) {
    return subscription
  }

  return prisma.userSubscription.update({
    where: { userId },
    data: { currentPeriodEnd },
    include: { subscriptionPlan: true },
  })
}

async function getUserSubscriptionRecord(userId: string) {
  return prisma.userSubscription.findUnique({
    where: { userId },
    include: { subscriptionPlan: true },
  })
}

export async function getUserSubscription(userId: string) {
  const subscription = await syncSubscriptionPeriodEndFromStripe(userId)

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

async function assertBillingAccountOwner(userId: string) {
  const user = await assertPatientUser(userId)

  if (user.managedByOwnerId) {
    throw new HttpError('Only the primary account holder can manage billing.', 403)
  }

  return user
}

export async function createCheckoutSession(userId: string, planId: string) {
  const user = await assertBillingAccountOwner(userId)

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
  const currentPeriodEnd = getStripeSubscriptionPeriodEnd(stripeSubscription)

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

export async function cancelSubscription(userId: string) {
  const user = await assertBillingAccountOwner(userId)
  const existing = await getUserSubscriptionRecord(user.id)

  if (!existing) {
    throw new HttpError('No subscription found.', 404)
  }

  if (!isSubscriptionActive(existing.status) && existing.status !== 'past_due') {
    throw new HttpError('There is no active subscription to cancel.', 400)
  }

  if (existing.cancelAtPeriodEnd) {
    throw new HttpError('Your subscription is already scheduled for cancellation.', 400)
  }

  if (!existing.stripeSubscriptionId) {
    const updated = await prisma.userSubscription.update({
      where: { userId: user.id },
      data: {
        cancelAtPeriodEnd: true,
      },
      include: { subscriptionPlan: true },
    })

    const response = toSubscriptionResponse(updated)

    return {
      subscription: response,
      isActive: isSubscriptionActive(updated.status),
    }
  }

  const stripe = getStripeClient()
  const stripeSubscription = await stripe.subscriptions.update(
    existing.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  )

  const subscription = await upsertSubscriptionFromStripe(
    user.id,
    existing.subscriptionPlanId,
    stripeSubscription
  )

  return {
    subscription,
    isActive: isSubscriptionActive(subscription.status as SubscriptionStatus),
  }
}

export async function changeSubscriptionPlan(userId: string, planId: string) {
  const user = await assertBillingAccountOwner(userId)
  const existing = await getUserSubscriptionRecord(user.id)

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })

  if (!plan) {
    throw new HttpError('Subscription plan not found.', 404)
  }

  if (!plan.stripePriceId) {
    throw new HttpError('This plan is not available for checkout yet.', 400)
  }

  if (existing?.subscriptionPlanId === plan.id && !existing.cancelAtPeriodEnd) {
    throw new HttpError('You are already on this plan.', 400)
  }

  if (existing?.stripeSubscriptionId) {
    const stripe = getStripeClient()
    const stripeSubscription = await stripe.subscriptions.retrieve(
      existing.stripeSubscriptionId
    )
    const subscriptionItemId = stripeSubscription.items.data[0]?.id

    if (!subscriptionItemId) {
      throw new HttpError('Unable to update your Stripe subscription.', 400)
    }

    const updatedStripeSubscription = await stripe.subscriptions.update(
      existing.stripeSubscriptionId,
      {
        items: [
          {
            id: subscriptionItemId,
            price: plan.stripePriceId,
          },
        ],
        cancel_at_period_end: false,
        proration_behavior: 'create_prorations',
        metadata: {
          userId: user.id,
          planId: plan.id,
        },
      }
    )

    const subscription = await upsertSubscriptionFromStripe(
      user.id,
      plan.id,
      updatedStripeSubscription
    )

    return {
      mode: 'updated' as const,
      subscription,
      isActive: isSubscriptionActive(subscription.status as SubscriptionStatus),
    }
  }

  const frontendUrl = getFrontendUrl()
  const session = await createSubscriptionCheckoutSession({
    userId: user.id,
    userEmail: user.email,
    planId: plan.id,
    stripePriceId: plan.stripePriceId,
    successUrl: `${frontendUrl}/patient/settings?tab=subscription&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${frontendUrl}/patient/settings?tab=subscription&cancelled=true`,
  })

  if (!session.url) {
    throw new HttpError('Failed to create checkout session.', 500)
  }

  return {
    mode: 'checkout' as const,
    checkoutUrl: session.url,
    sessionId: session.id,
  }
}
