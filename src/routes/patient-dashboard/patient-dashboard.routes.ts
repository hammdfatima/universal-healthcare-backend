import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  dashboardStatsSchema,
  messageResponseSchema,
} from '~/routes/patient-dashboard/patient-dashboard.schemas'

export const PATIENT_DASHBOARD_ROUTES = {
  getDashboardStats: createRoute({
    method: 'get',
    tags: ['Patient Dashboard'],
    path: '/patient-dashboard/stats',
    summary: 'Get dashboard stats for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(dashboardStatsSchema),
        'Dashboard stats'
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
