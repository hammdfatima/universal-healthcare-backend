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

export async function getAdminDashboardStats() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange()

  const [
    totalUsers,
    activeSubscriptions,
    paymentsThisMonth,
    monthlyRevenueAggregate,
    yearPayments,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: USER_ROLES.USER },
    }),
    prisma.userSubscription.count({
      where: {
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
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
    prisma.payment.aggregate({
      where: {
        status: 'paid',
        paidAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      _sum: {
        amountCents: true,
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

  const monthlyRevenueCents = monthlyRevenueAggregate._sum.amountCents ?? 0

  const chartBuckets = MONTH_LABELS.map((month, monthIndex) => ({
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
