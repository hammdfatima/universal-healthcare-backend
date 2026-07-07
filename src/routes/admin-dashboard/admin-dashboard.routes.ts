import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  adminDashboardStatsSchema,
  messageResponseSchema,
} from '~/routes/admin-dashboard/admin-dashboard.schemas'

export const ADMIN_DASHBOARD_ROUTES = {
  getDashboardStats: createRoute({
    method: 'get',
    tags: ['Admin Dashboard'],
    path: '/admin/dashboard/stats',
    summary: 'Get dashboard stats for the admin panel',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(adminDashboardStatsSchema),
        'Admin dashboard stats'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Forbidden'
      ),
    },
  }),
}
