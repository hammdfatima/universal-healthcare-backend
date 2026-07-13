import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  adminAuditLogsListSchema,
  messageResponseSchema,
} from '~/routes/admin-audit-logs/admin-audit-logs.schemas'

export const ADMIN_AUDIT_LOGS_ROUTES = {
  listAuditLogs: createRoute({
    method: 'get',
    tags: ['Admin Audit Logs'],
    path: '/admin/audit-logs',
    summary: 'List recent audit logs (admin)',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(adminAuditLogsListSchema),
        'Audit logs list'
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
