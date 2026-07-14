import { USER_ROLES } from '~/config/roles'
import { formatPaymentAmount } from '~/lib/payment-records'
import prisma from '~/lib/prisma'

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const

function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1))

  return { start, end }
}

function getCurrentMonthRange() {
  const now = new Date()
  return getMonthRange(now.getUTCFullYear(), now.getUTCMonth())
}

/** Parse stored plan price strings like "$9.95" or "9.95" into cents. */
function parsePlanPriceToCents(price: string): number {
  const normalized = price.replace(/[^0-9.]/g, '')
  const amount = Number.parseFloat(normalized)

  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }

  return Math.round(amount * 100)
}

/** Monthly recurring contribution in cents for one plan price + cycle. */
function toMonthlyRevenueCents(price: string, billingCycle: string): number {
  const cents = parsePlanPriceToCents(price)

  if (billingCycle === 'yearly') {
    return Math.round(cents / 12)
  }

  return cents
}

export async function getAdminDashboardStats() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange()

  const [
    totalUsers,
    activeOwnerSubscriptions,
    paymentsThisMonth,
    yearPayments,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: USER_ROLES.USER },
    }),
    // Paying account owners only (exclude family member snapshot subscriptions).
    prisma.userSubscription.findMany({
      where: {
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
        user: {
          role: USER_ROLES.USER,
          managedByOwnerId: null,
        },
      },
      select: {
        subscriptionPlan: {
          select: {
            price: true,
            billingCycle: true,
          },
        },
      },
    }),
    prisma.payment.count({
      where: {
        status: 'paid',
        paidAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    }),
    prisma.payment.findMany({
      where: {
        status: 'paid',
        paidAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: {
        amountCents: true,
        paidAt: true,
      },
    }),
  ])

  const activeSubscriptions = activeOwnerSubscriptions.length
  const monthlyRevenueCents = activeOwnerSubscriptions.reduce(
    (total, subscription) =>
      total +
      toMonthlyRevenueCents(
        subscription.subscriptionPlan.price,
        subscription.subscriptionPlan.billingCycle
      ),
    0
  )

  const chartBuckets = MONTH_LABELS.map((month) => ({
    month,
    revenue: 0,
    payments: 0,
  }))

  for (const payment of yearPayments) {
    if (!payment.paidAt) continue

    const monthIndex = payment.paidAt.getUTCMonth()
    chartBuckets[monthIndex].revenue += payment.amountCents / 100
    chartBuckets[monthIndex].payments += 1
  }

  return {
    counts: {
      totalUsers,
      activeSubscriptions,
      monthlyRevenue: formatPaymentAmount(monthlyRevenueCents),
      paymentsThisMonth,
    },
    paymentsChart: chartBuckets,
  }
}
