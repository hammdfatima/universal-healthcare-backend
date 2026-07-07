import { z } from '@hono/zod-openapi'

export const adminDashboardCountsSchema = z
  .object({
    totalUsers: z.number().int().nonnegative(),
    activeSubscriptions: z.number().int().nonnegative(),
    monthlyRevenue: z.string(),
    paymentsThisMonth: z.number().int().nonnegative(),
  })
  .openapi('AdminDashboardCounts')

export const adminPaymentsChartItemSchema = z
  .object({
    month: z.string(),
    revenue: z.number().nonnegative(),
    payments: z.number().int().nonnegative(),
  })
  .openapi('AdminPaymentsChartItem')

export const adminDashboardStatsSchema = z
  .object({
    counts: adminDashboardCountsSchema,
    paymentsChart: z.array(adminPaymentsChartItemSchema),
  })
  .openapi('AdminDashboardStats')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('AdminDashboardMessageResponse')
