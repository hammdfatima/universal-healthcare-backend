import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  messageResponseSchema,
  retentionJobResultSchema,
  runRetentionJobBodySchema,
} from '~/routes/admin-retention/admin-retention.schemas'

export const ADMIN_RETENTION_ROUTES = {
  runRetentionJob: createRoute({
    method: 'post',
    tags: ['Admin Retention'],
    path: '/admin/retention-job',
    summary: 'Run the HIPAA data retention job (admin)',
    description:
      'Dry-run by default; pass { "live": true } to actually purge eligible OTPs and revoked sessions. Audit logs are append-only and are never purged automatically.',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(runRetentionJobBodySchema, 'Retention job options'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(retentionJobResultSchema),
        'Retention job summary'
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
