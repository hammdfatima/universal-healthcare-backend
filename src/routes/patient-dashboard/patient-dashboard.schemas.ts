import { z } from '@hono/zod-openapi'

export const dashboardCountsSchema = z
  .object({
    medications: z.number().int().nonnegative(),
    allergies: z.number().int().nonnegative(),
    vaccinations: z.number().int().nonnegative(),
    documents: z.number().int().nonnegative(),
    labResults: z.number().int().nonnegative(),
    imagingResults: z.number().int().nonnegative(),
  })
  .openapi('DashboardCounts')

export const dashboardStatsSchema = z
  .object({
    counts: dashboardCountsSchema,
  })
  .openapi('DashboardStats')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('DashboardMessageResponse')
