import type { SubscriptionStatus, UserSubscription } from '~/generated/prisma'
import { USER_ROLES } from '~/config/roles'
import { ensureCurrencyPrice } from '~/lib/currency'
import { HttpError } from '~/lib/error'
import { syncHouseholdAccessAfterPlanChange } from '~/lib/household-access'
import {
  upsertPaymentFromCheckoutSession,
  upsertPaymentFromStripeInvoice,
  syncPaymentsForStripeSubscription,
} from '~/lib/payment-records'
import prisma from '~/lib/prisma'
import {
  constructStripeWebhookEvent,
  createSubscriptionCheckoutSession,
  getFrontendUrl,
  getStripeClient,
  parsePriceToCents,
} from '~/lib/stripe'
import type Stripe from 'stripe'

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing']

type PlanRecord = {
  id: string
  planName: string
  price: string
  billingCycle: 'monthly' | 'yearly'
  features: string[]
  memberLimit: number
  allowsPets: boolean
  stripePriceId: string | null
}

type ChangeType = 'upgrade' | 'downgrade' | 'reactivate' | 'new'

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

function toPlanSummary(plan: PlanRecord) {
  return {
    id: plan.id,
    planName: plan.planName,
    price: ensureCurrencyPrice(plan.price),
    billingCycle: plan.billingCycle,
    features: plan.features,
    memberLimit: plan.memberLimit,
    allowsPets: plan.allowsPets,
  }
}

function toSubscriptionResponse(
  subscription: UserSubscription & {
    subscriptionPlan: PlanRecord
    scheduledPlan?: PlanRecord | null
  }
) {
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    plan: toPlanSummary(subscription.subscriptionPlan),
    scheduledPlan: subscription.scheduledPlan
      ? toPlanSummary(subscription.scheduledPlan)
      : null,
    scheduledPlanChangeAt:
      subscription.scheduledPlanChangeAt?.toISOString() ?? null,
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

function getStripeSubscriptionPeriodStart(
  stripeSubscription: Stripe.Subscription
): number | null {
  const legacyPeriodStart = (
    stripeSubscription as Stripe.Subscription & {
      current_period_start?: number | null
    }
  ).current_period_start

  return (
    legacyPeriodStart ??
    stripeSubscription.items?.data?.[0]?.current_period_start ??
    null
  )
}

function formatMoneyFromCents(amountCents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100)
}

function classifyPlanChange(
  current: PlanRecord | null | undefined,
  target: PlanRecord,
  cancelAtPeriodEnd: boolean
): ChangeType {
  if (!current) {
    return 'new'
  }

  if (current.id === target.id && cancelAtPeriodEnd) {
    return 'reactivate'
  }

  const currentCents = parsePriceToCents(current.price)
  const targetCents = parsePriceToCents(target.price)

  if (targetCents > currentCents) {
    return 'upgrade'
  }

  if (targetCents < currentCents) {
    return 'downgrade'
  }

  if (
    current.billingCycle === 'monthly' &&
    target.billingCycle === 'yearly'
  ) {
    return 'upgrade'
  }

  if (
    current.billingCycle === 'yearly' &&
    target.billingCycle === 'monthly'
  ) {
    return 'downgrade'
  }

  return 'upgrade'
}

async function findPlanIdByStripePriceId(stripePriceId: string | null | undefined) {
  if (!stripePriceId) {
    return null
  }

  const plan = await prisma.subscriptionPlan.findFirst({
    where: { stripePriceId },
  })

  return plan?.id ?? null
}

async function resolvePlanIdFromStripeSubscription(
  stripeSubscription: Stripe.Subscription
) {
  // Prefer the active Stripe price so scheduled phase changes sync correctly.
  const priceId = stripeSubscription.items.data[0]?.price?.id
  const fromPrice = await findPlanIdByStripePriceId(priceId)
  if (fromPrice) {
    return fromPrice
  }

  const fromMetadata = stripeSubscription.metadata?.planId
  if (fromMetadata) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: fromMetadata },
    })
    if (plan) {
      return plan.id
    }
  }

  return null
}

async function syncLatestSubscriptionPayment(
  stripeSubscriptionId: string,
  userId: string,
  planId: string
) {
  const stripe = getStripeClient()
  const invoices = await stripe.invoices.list({
    subscription: stripeSubscriptionId,
    limit: 3,
  })

  for (const invoice of invoices.data) {
    await upsertPaymentFromStripeInvoice({
      ...invoice,
      metadata: {
        userId,
        planId,
        ...(invoice.metadata ?? {}),
      },
    })
  }
}

async function releaseExistingSubscriptionSchedule(
  stripeSubscription: Stripe.Subscription
) {
  const scheduleRef = stripeSubscription.schedule
  if (!scheduleRef) {
    return
  }

  const stripe = getStripeClient()
  const scheduleId =
    typeof scheduleRef === 'string' ? scheduleRef : scheduleRef.id

  try {
    await stripe.subscriptionSchedules.release(scheduleId)
  } catch {
    // Schedule may already be released or completed.
  }
}

async function previewProrationAmount(input: {
  customerId: string
  subscriptionId: string
  subscriptionItemId: string
  newPriceId: string
}) {
  const stripe = getStripeClient()

  try {
    const invoicesApi = stripe.invoices as typeof stripe.invoices & {
      createPreview?: (params: Record<string, unknown>) => Promise<Stripe.Invoice>
      retrieveUpcoming?: (params: Record<string, unknown>) => Promise<Stripe.Invoice>
    }

    const preview = invoicesApi.createPreview
      ? await invoicesApi.createPreview({
          customer: input.customerId,
          subscription: input.subscriptionId,
          subscription_details: {
            items: [
              {
                id: input.subscriptionItemId,
                price: input.newPriceId,
              },
            ],
            proration_behavior: 'create_prorations',
          },
        })
      : await invoicesApi.retrieveUpcoming!({
          customer: input.customerId,
          subscription: input.subscriptionId,
          subscription_items: [
            {
              id: input.subscriptionItemId,
              price: input.newPriceId,
            },
          ],
          proration_behavior: 'create_prorations',
        })

    const amountDue = preview.amount_due ?? 0
    const currency = preview.currency ?? 'usd'

    return {
      amountDueCents: amountDue,
      amountDueFormatted: formatMoneyFromCents(Math.max(amountDue, 0), currency),
      creditCents: amountDue < 0 ? Math.abs(amountDue) : 0,
      creditFormatted:
        amountDue < 0
          ? formatMoneyFromCents(Math.abs(amountDue), currency)
          : null,
      currency,
    }
  } catch {
    return null
  }
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
    include: {
      subscriptionPlan: true,
      scheduledPlan: true,
    },
  })
}

async function getUserSubscriptionRecord(userId: string) {
  return prisma.userSubscription.findUnique({
    where: { userId },
    include: {
      subscriptionPlan: true,
      scheduledPlan: true,
    },
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

  const existing = await getUserSubscriptionRecord(user.id)

  const session = await createSubscriptionCheckoutSession({
    userId: user.id,
    userEmail: user.email,
    planId: plan.id,
    stripePriceId: plan.stripePriceId,
    stripeCustomerId: existing?.stripeCustomerId,
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
  stripeSubscription: Stripe.Subscription,
  options?: {
    scheduledPlanId?: string | null
    scheduledPlanChangeAt?: Date | null
    clearSchedule?: boolean
  }
) {
  const status = mapStripeSubscriptionStatus(stripeSubscription.status)
  const currentPeriodEnd = getStripeSubscriptionPeriodEnd(stripeSubscription)

  const scheduleData = options?.clearSchedule
    ? {
        scheduledPlanId: null,
        scheduledPlanChangeAt: null,
      }
    : options?.scheduledPlanId !== undefined
      ? {
          scheduledPlanId: options.scheduledPlanId,
          scheduledPlanChangeAt: options.scheduledPlanChangeAt ?? null,
        }
      : {}

  // If a scheduled phase just applied, clear pending schedule when active plan matches it.
  let resolvedScheduleClear = options?.clearSchedule ?? false
  if (!options && !stripeSubscription.schedule) {
    const existing = await prisma.userSubscription.findUnique({
      where: { userId },
      select: { scheduledPlanId: true },
    })
    if (existing?.scheduledPlanId && existing.scheduledPlanId === planId) {
      resolvedScheduleClear = true
    }
  }

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
      ...(resolvedScheduleClear
        ? { scheduledPlanId: null, scheduledPlanChangeAt: null }
        : scheduleData),
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
      ...(resolvedScheduleClear
        ? { scheduledPlanId: null, scheduledPlanChangeAt: null }
        : scheduleData),
    },
    include: {
      subscriptionPlan: true,
      scheduledPlan: true,
    },
  })

  await syncPaymentsForStripeSubscription(
    stripeSubscription.id,
    userId,
    planId
  ).catch(() => undefined)

  await syncHouseholdAccessAfterPlanChange(userId)

  return toSubscriptionResponse(subscription)
}

export async function verifyCheckoutSession(userId: string, sessionId: string) {
  await assertPatientUser(userId)

  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'payment_intent', 'invoice'],
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
    stripeSubscription,
    { clearSchedule: true }
  )

  await upsertPaymentFromCheckoutSession(session)

  return {
    subscription,
    isActive: isSubscriptionActive(subscription.status as SubscriptionStatus),
  }
}

export async function handleStripeWebhook(payload: string, signature: string) {
  const event = await constructStripeWebhookEvent(payload, signature)

  switch (event.type) {
    case 'checkout.session.completed': {
      const stripe = getStripeClient()
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
        expand: ['subscription', 'payment_intent', 'invoice'],
      })
      const userId = session.metadata?.userId
      const planId = session.metadata?.planId

      await upsertPaymentFromCheckoutSession(session)

      if (!userId || !planId || !session.subscription) {
        break
      }

      const stripeSubscription =
        typeof session.subscription === 'string'
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription

      await upsertSubscriptionFromStripe(userId, planId, stripeSubscription, {
        clearSchedule: true,
      })
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const stripeSubscription = event.data.object as Stripe.Subscription
      const userId =
        stripeSubscription.metadata?.userId ??
        (
          await prisma.userSubscription.findFirst({
            where: { stripeSubscriptionId: stripeSubscription.id },
            select: { userId: true },
          })
        )?.userId

      if (!userId) {
        break
      }

      const planId = await resolvePlanIdFromStripeSubscription(stripeSubscription)

      if (!planId) {
        break
      }

      await upsertSubscriptionFromStripe(userId, planId, stripeSubscription)
      break
    }

    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.updated': {
      const invoice = event.data.object as Stripe.Invoice
      await upsertPaymentFromStripeInvoice(invoice)
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
      include: {
        subscriptionPlan: true,
        scheduledPlan: true,
      },
    })

    const response = toSubscriptionResponse(updated)

    return {
      subscription: response,
      isActive: isSubscriptionActive(updated.status),
    }
  }

  const stripe = getStripeClient()
  const currentStripeSub = await stripe.subscriptions.retrieve(
    existing.stripeSubscriptionId
  )
  await releaseExistingSubscriptionSchedule(currentStripeSub)

  const stripeSubscription = await stripe.subscriptions.update(
    existing.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  )

  const subscription = await upsertSubscriptionFromStripe(
    user.id,
    existing.subscriptionPlanId,
    stripeSubscription,
    { clearSchedule: true }
  )

  return {
    subscription,
    isActive: isSubscriptionActive(subscription.status as SubscriptionStatus),
  }
}

async function buildChangePlanContext(userId: string, planId: string) {
  const user = await assertBillingAccountOwner(userId)
  const existing = await getUserSubscriptionRecord(user.id)
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })

  if (!plan) {
    throw new HttpError('Subscription plan not found.', 404)
  }

  if (!plan.stripePriceId) {
    throw new HttpError('This plan is not available for checkout yet.', 400)
  }

  if (
    existing?.subscriptionPlanId === plan.id &&
    !existing.cancelAtPeriodEnd &&
    !existing.scheduledPlanId
  ) {
    throw new HttpError('You are already on this plan.', 400)
  }

  if (existing?.scheduledPlanId === plan.id) {
    throw new HttpError('This plan is already scheduled to start at period end.', 400)
  }

  const changeType = classifyPlanChange(
    existing?.subscriptionPlan,
    plan,
    Boolean(existing?.cancelAtPeriodEnd)
  )

  return { user, existing, plan, changeType }
}

export async function previewChangePlan(userId: string, planId: string) {
  const { existing, plan, changeType } = await buildChangePlanContext(userId, planId)

  if (
    existing?.stripeSubscriptionId &&
    existing.subscriptionPlanId === plan.id &&
    existing.scheduledPlanId
  ) {
    return {
      mode: 'updated' as const,
      changeType: 'reactivate' as const,
      currentPlan: toPlanSummary(existing.subscriptionPlan),
      targetPlan: toPlanSummary(plan),
      amountDueCents: 0,
      amountDueFormatted: formatMoneyFromCents(0),
      creditCents: 0,
      creditFormatted: null,
      effectiveAt: null,
      summary: `Cancel the scheduled switch to ${existing.scheduledPlan?.planName ?? 'another plan'} and keep ${plan.planName}. No charge today.`,
    }
  }

  if (!existing?.stripeSubscriptionId) {
    const amountCents = parsePriceToCents(plan.price)

    return {
      mode: 'checkout' as const,
      changeType,
      currentPlan: existing ? toPlanSummary(existing.subscriptionPlan) : null,
      targetPlan: toPlanSummary(plan),
      amountDueCents: amountCents,
      amountDueFormatted: ensureCurrencyPrice(plan.price),
      creditCents: 0,
      creditFormatted: null,
      effectiveAt: null,
      summary:
        'You will complete Stripe Checkout and pay the full plan price to start this subscription.',
    }
  }

  const stripe = getStripeClient()
  const stripeSubscription = await stripe.subscriptions.retrieve(
    existing.stripeSubscriptionId
  )
  const subscriptionItemId = stripeSubscription.items.data[0]?.id
  const customerId =
    typeof stripeSubscription.customer === 'string'
      ? stripeSubscription.customer
      : stripeSubscription.customer.id

  if (!subscriptionItemId || !plan.stripePriceId) {
    throw new HttpError('Unable to preview this plan change.', 400)
  }

  const periodEnd = getStripeSubscriptionPeriodEnd(stripeSubscription)

  if (changeType === 'downgrade') {
    return {
      mode: 'scheduled' as const,
      changeType,
      currentPlan: toPlanSummary(existing.subscriptionPlan),
      targetPlan: toPlanSummary(plan),
      amountDueCents: 0,
      amountDueFormatted: formatMoneyFromCents(0),
      creditCents: 0,
      creditFormatted: null,
      effectiveAt: periodEnd?.toISOString() ?? null,
      summary: `No charge today. Your current plan stays active until ${
        periodEnd
          ? periodEnd.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'the end of the billing period'
      }, then switches to ${plan.planName}.`,
    }
  }

  if (changeType === 'reactivate') {
    return {
      mode: 'updated' as const,
      changeType,
      currentPlan: toPlanSummary(existing.subscriptionPlan),
      targetPlan: toPlanSummary(plan),
      amountDueCents: 0,
      amountDueFormatted: formatMoneyFromCents(0),
      creditCents: 0,
      creditFormatted: null,
      effectiveAt: null,
      summary:
        'Cancellation will be reversed and your current plan will continue without an extra charge.',
    }
  }

  const proration = await previewProrationAmount({
    customerId,
    subscriptionId: existing.stripeSubscriptionId,
    subscriptionItemId,
    newPriceId: plan.stripePriceId,
  })

  const amountDueCents = proration?.amountDueCents ?? 0
  const creditCents = proration?.creditCents ?? 0

  return {
    mode: 'updated' as const,
    changeType,
    currentPlan: toPlanSummary(existing.subscriptionPlan),
    targetPlan: toPlanSummary(plan),
    amountDueCents: Math.max(amountDueCents, 0),
    amountDueFormatted:
      proration?.amountDueFormatted ??
      ensureCurrencyPrice(plan.price),
    creditCents,
    creditFormatted: proration?.creditFormatted ?? null,
    effectiveAt: null,
    summary:
      amountDueCents > 0
        ? `You will be charged ${proration?.amountDueFormatted ?? ensureCurrencyPrice(plan.price)} today for the prorated difference. ${plan.planName} starts immediately.`
        : creditCents > 0
          ? `Unused time credit of ${proration?.creditFormatted} will apply to your next invoice. ${plan.planName} starts immediately.`
          : `${plan.planName} starts immediately with no additional charge today.`,
  }
}

async function scheduleDowngradeAtPeriodEnd(input: {
  userId: string
  currentPlanId: string
  targetPlan: PlanRecord
  stripeSubscription: Stripe.Subscription
}) {
  const stripe = getStripeClient()
  const currentPriceId = input.stripeSubscription.items.data[0]?.price?.id
  const periodStart = getStripeSubscriptionPeriodStart(input.stripeSubscription)
  const periodEnd = getStripeSubscriptionPeriodEnd(input.stripeSubscription)

  if (!currentPriceId || !input.targetPlan.stripePriceId || !periodStart || !periodEnd) {
    throw new HttpError('Unable to schedule this plan change.', 400)
  }

  await releaseExistingSubscriptionSchedule(input.stripeSubscription)

  // Ensure cancel_at_period_end is cleared before attaching a schedule.
  if (input.stripeSubscription.cancel_at_period_end) {
    await stripe.subscriptions.update(input.stripeSubscription.id, {
      cancel_at_period_end: false,
    })
  }

  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: input.stripeSubscription.id,
  })

  const phaseStart =
    schedule.phases[0]?.start_date ?? periodStart

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    phases: [
      {
        items: [{ price: currentPriceId, quantity: 1 }],
        start_date: phaseStart,
        end_date: Math.floor(periodEnd.getTime() / 1000),
        metadata: {
          userId: input.userId,
          planId: input.currentPlanId,
        },
      },
      {
        items: [{ price: input.targetPlan.stripePriceId, quantity: 1 }],
        metadata: {
          userId: input.userId,
          planId: input.targetPlan.id,
        },
      },
    ],
    metadata: {
      userId: input.userId,
      planId: input.targetPlan.id,
      scheduledPlanId: input.targetPlan.id,
    },
  })

  // Keep active subscription metadata on current plan until switch.
  await stripe.subscriptions.update(input.stripeSubscription.id, {
    metadata: {
      userId: input.userId,
      planId: input.currentPlanId,
      scheduledPlanId: input.targetPlan.id,
    },
  })

  const refreshed = await stripe.subscriptions.retrieve(input.stripeSubscription.id)

  return upsertSubscriptionFromStripe(
    input.userId,
    input.currentPlanId,
    refreshed,
    {
      scheduledPlanId: input.targetPlan.id,
      scheduledPlanChangeAt: periodEnd,
    }
  )
}

export async function changeSubscriptionPlan(userId: string, planId: string) {
  const { user, existing, plan, changeType } = await buildChangePlanContext(
    userId,
    planId
  )

  if (existing?.stripeSubscriptionId) {
    const stripe = getStripeClient()
    const stripeSubscription = await stripe.subscriptions.retrieve(
      existing.stripeSubscriptionId
    )
    const subscriptionItemId = stripeSubscription.items.data[0]?.id

    if (!subscriptionItemId || !plan.stripePriceId) {
      throw new HttpError('Unable to update your Stripe subscription.', 400)
    }

    if (
      existing.subscriptionPlanId === plan.id &&
      existing.scheduledPlanId
    ) {
      await releaseExistingSubscriptionSchedule(stripeSubscription)
      const refreshed = await stripe.subscriptions.update(
        existing.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
          metadata: {
            userId: user.id,
            planId: plan.id,
          },
        }
      )
      const subscription = await upsertSubscriptionFromStripe(
        user.id,
        plan.id,
        refreshed,
        { clearSchedule: true }
      )

      return {
        mode: 'updated' as const,
        changeType: 'reactivate' as const,
        amountDueCents: 0,
        amountDueFormatted: formatMoneyFromCents(0),
        effectiveAt: null,
        subscription,
        isActive: isSubscriptionActive(subscription.status as SubscriptionStatus),
        summary: `Scheduled plan change cancelled. You will remain on ${plan.planName}.`,
      }
    }

    if (changeType === 'downgrade') {
      const subscription = await scheduleDowngradeAtPeriodEnd({
        userId: user.id,
        currentPlanId: existing.subscriptionPlanId,
        targetPlan: plan,
        stripeSubscription,
      })

      return {
        mode: 'scheduled' as const,
        changeType,
        amountDueCents: 0,
        amountDueFormatted: formatMoneyFromCents(0),
        effectiveAt: subscription.scheduledPlanChangeAt,
        subscription,
        isActive: isSubscriptionActive(subscription.status as SubscriptionStatus),
        summary: `Downgrade scheduled. You keep ${existing.subscriptionPlan.planName} until period end, then switch to ${plan.planName}.`,
      }
    }

    await releaseExistingSubscriptionSchedule(stripeSubscription)

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
        proration_behavior:
          changeType === 'reactivate' ? 'none' : 'always_invoice',
        metadata: {
          userId: user.id,
          planId: plan.id,
        },
      }
    )

    const subscription = await upsertSubscriptionFromStripe(
      user.id,
      plan.id,
      updatedStripeSubscription,
      { clearSchedule: true }
    )

    await syncLatestSubscriptionPayment(
      updatedStripeSubscription.id,
      user.id,
      plan.id
    ).catch(() => undefined)

    const latestInvoice = await stripe.invoices
      .list({
        subscription: updatedStripeSubscription.id,
        limit: 1,
      })
      .then(result => result.data[0] ?? null)
      .catch(() => null)

    const amountDueCents = latestInvoice?.amount_paid ?? latestInvoice?.amount_due ?? 0

    return {
      mode: 'updated' as const,
      changeType,
      amountDueCents,
      amountDueFormatted: formatMoneyFromCents(amountDueCents),
      effectiveAt: null,
      subscription,
      isActive: isSubscriptionActive(subscription.status as SubscriptionStatus),
      summary:
        changeType === 'reactivate'
          ? 'Your plan will continue. Cancellation has been removed.'
          : amountDueCents > 0
            ? `Plan updated. Charged ${formatMoneyFromCents(amountDueCents)} for the prorated difference.`
            : `Plan updated to ${plan.planName}.`,
    }
  }

  const frontendUrl = getFrontendUrl()
  const session = await createSubscriptionCheckoutSession({
    userId: user.id,
    userEmail: user.email,
    planId: plan.id,
    stripePriceId: plan.stripePriceId!,
    stripeCustomerId: existing?.stripeCustomerId,
    successUrl: `${frontendUrl}/patient/settings?tab=subscription&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${frontendUrl}/patient/settings?tab=subscription&cancelled=true`,
  })

  if (!session.url) {
    throw new HttpError('Failed to create checkout session.', 500)
  }

  return {
    mode: 'checkout' as const,
    changeType,
    amountDueCents: parsePriceToCents(plan.price),
    amountDueFormatted: ensureCurrencyPrice(plan.price),
    effectiveAt: null,
    checkoutUrl: session.url,
    sessionId: session.id,
    summary: 'Complete Stripe Checkout to start this subscription.',
  }
}
