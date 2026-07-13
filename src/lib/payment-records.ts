import type Stripe from 'stripe'
import type { PaymentRecordStatus, User } from '~/generated/prisma'
import { decryptPhiNullable } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { getStripeClient } from '~/lib/stripe'

function getUserDisplayName(user: Pick<User, 'name' | 'firstName' | 'lastName' | 'email'>) {
  const name = decryptPhiNullable(user.name)
  if (name?.trim()) {
    return name.trim()
  }

  const parts = [decryptPhiNullable(user.firstName), decryptPhiNullable(user.lastName)].filter(
    (part): part is string => Boolean(part)
  )

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return user.email.split('@')[0] ?? user.email
}

export function formatPaymentAmount(amountCents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100)
}

export function formatPaymentDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatBillingCycleLabel(billingCycle: string | null | undefined) {
  if (!billingCycle) {
    return 'Monthly'
  }

  return billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)
}

function mapStripeInvoiceStatus(status: Stripe.Invoice.Status): PaymentRecordStatus {
  switch (status) {
    case 'paid':
      return 'paid'
    case 'open':
    case 'draft':
      return 'pending'
    default:
      return 'failed'
  }
}

function mapCheckoutPaymentStatus(
  paymentStatus: Stripe.Checkout.Session.PaymentStatus
): PaymentRecordStatus {
  switch (paymentStatus) {
    case 'paid':
      return 'paid'
    case 'unpaid':
      return 'pending'
    default:
      return 'failed'
  }
}

function buildInvoiceNumber(prefix: string, identifier: string) {
  const year = new Date().getUTCFullYear()
  const suffix = identifier
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8)
    .toUpperCase()

  return `INV-${year}-${suffix || prefix}`
}

export function toAdminPaymentResponse(payment: {
  id: string
  invoiceNumber: string
  amountCents: number
  currency: string
  status: PaymentRecordStatus
  billingCycle: string
  paymentMethod: string | null
  transactionId: string | null
  paidAt: Date | null
  createdAt: Date
  user: Pick<User, 'email' | 'name' | 'firstName' | 'lastName'>
  subscriptionPlan: { planName: string } | null
}) {
  const paidAt = payment.paidAt ?? payment.createdAt

  return {
    id: payment.id,
    invoiceNumber: payment.invoiceNumber,
    user: getUserDisplayName(payment.user),
    email: payment.user.email,
    plan: payment.subscriptionPlan?.planName ?? 'Subscription',
    amount: formatPaymentAmount(payment.amountCents, payment.currency),
    status: payment.status,
    date: formatPaymentDate(paidAt),
    billingCycle: payment.billingCycle,
    paymentMethod: payment.paymentMethod ?? 'Card',
    transactionId: payment.transactionId ?? payment.id,
  }
}

async function resolvePlanId(planId?: string | null) {
  if (!planId) {
    return null
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })

  return plan?.id ?? null
}

export async function upsertPaymentFromCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId

  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    return null
  }

  const subscriptionPlanId = await resolvePlanId(planId)
  const plan = subscriptionPlanId
    ? await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } })
    : null

  const amountCents = session.amount_total ?? 0
  const status = mapCheckoutPaymentStatus(session.payment_status)
  const paidAt = status === 'paid' ? new Date() : null
  const transactionId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id)

  const paymentData = {
    userId,
    subscriptionPlanId,
    invoiceNumber: buildInvoiceNumber('CHK', session.id),
    stripeCheckoutSessionId: session.id,
    amountCents,
    currency: session.currency ?? 'usd',
    status,
    billingCycle: formatBillingCycleLabel(plan?.billingCycle),
    paymentMethod: 'Card',
    transactionId,
    paidAt,
  }

  const existing = await prisma.payment.findFirst({
    where: {
      OR: [{ stripeCheckoutSessionId: session.id }, { transactionId }],
    },
  })

  if (existing) {
    return prisma.payment.update({
      where: { id: existing.id },
      data: paymentData,
    })
  }

  return prisma.payment.create({
    data: paymentData,
  })
}

export async function syncPaymentsForStripeSubscription(
  stripeSubscriptionId: string,
  userId: string,
  planId: string
) {
  const stripe = getStripeClient()

  const invoices = await stripe.invoices.list({
    subscription: stripeSubscriptionId,
    limit: 24,
    status: 'paid',
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

export async function backfillPaymentsFromStripeSubscriptions() {
  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      stripeSubscriptionId: { not: null },
    },
    select: {
      userId: true,
      subscriptionPlanId: true,
      stripeSubscriptionId: true,
    },
  })

  let synced = 0

  for (const subscription of subscriptions) {
    if (!subscription.stripeSubscriptionId) {
      continue
    }

    await syncPaymentsForStripeSubscription(
      subscription.stripeSubscriptionId,
      subscription.userId,
      subscription.subscriptionPlanId
    )
    synced += 1
  }

  return { subscriptionsProcessed: synced }
}

export async function upsertPaymentFromStripeInvoice(invoice: Stripe.Invoice) {
  const stripe = invoice as Stripe.Invoice & {
    subscription_details?: { metadata?: { userId?: string; planId?: string } }
  }

  let userId = invoice.metadata?.userId ?? stripe.subscription_details?.metadata?.userId ?? null
  const planId = invoice.metadata?.planId ?? stripe.subscription_details?.metadata?.planId ?? null

  if (!userId && invoice.customer_email) {
    const user = await prisma.user.findUnique({
      where: { email: invoice.customer_email },
    })
    userId = user?.id ?? null
  }

  if (!userId) {
    return null
  }

  const subscriptionPlanId = await resolvePlanId(planId)
  const plan = subscriptionPlanId
    ? await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } })
    : null

  const amountCents = invoice.amount_paid || invoice.amount_due || 0
  const status = mapStripeInvoiceStatus(invoice.status ?? 'open')
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000)
    : status === 'paid'
      ? new Date()
      : null

  const transactionId =
    typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : (invoice.payment_intent?.id ?? invoice.id)

  const paymentData = {
    userId,
    subscriptionPlanId,
    invoiceNumber: invoice.number ?? buildInvoiceNumber('INV', invoice.id),
    stripeInvoiceId: invoice.id,
    amountCents,
    currency: invoice.currency ?? 'usd',
    status,
    billingCycle: formatBillingCycleLabel(plan?.billingCycle),
    paymentMethod: 'Card',
    transactionId,
    paidAt,
  }

  const existing = await prisma.payment.findFirst({
    where: {
      OR: [{ stripeInvoiceId: invoice.id }, { transactionId }],
    },
  })

  if (existing) {
    return prisma.payment.update({
      where: { id: existing.id },
      data: paymentData,
    })
  }

  return prisma.payment.create({
    data: paymentData,
  })
}
