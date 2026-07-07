import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  emergencyAccessStatusSchema,
  emergencyAccessTokenParamSchema,
  emergencyAccessTokenSchema,
  messageResponseSchema,
  publicEmergencyRecordsSchema,
} from '~/routes/emergency-access/emergency-access.schemas'

export const EMERGENCY_ACCESS_ROUTES = {
  getStatus: createRoute({
    method: 'get',
    tags: ['Emergency Access'],
    path: '/emergency-access',
    summary: 'Get emergency QR access status for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(emergencyAccessStatusSchema),
        'Emergency access status'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  generate: createRoute({
    method: 'post',
    tags: ['Emergency Access'],
    path: '/emergency-access/generate',
    summary: 'Generate or regenerate emergency QR access link',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(emergencyAccessTokenSchema),
        'Emergency access generated'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  revoke: createRoute({
    method: 'delete',
    tags: ['Emergency Access'],
    path: '/emergency-access',
    summary: 'Revoke emergency QR access link',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Emergency access revoked'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Not found'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  getPublicRecords: createRoute({
    method: 'get',
    tags: ['Emergency Access'],
    path: '/emergency-access/public/{token}',
    summary: 'View patient medical records via emergency access token',
    request: {
      params: emergencyAccessTokenParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(publicEmergencyRecordsSchema),
        'Emergency medical records'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid or revoked token'
      ),
    },
  }),
}
