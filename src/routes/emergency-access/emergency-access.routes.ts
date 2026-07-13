import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  emergencyAccessStatusSchema,
  emergencyAccessTokenParamSchema,
  emergencyAccessTokenSchema,
  generateEmergencyAccessBodySchema,
  messageResponseSchema,
  publicEmergencyChallengeSchema,
  publicEmergencyRecordsSchema,
  unlockEmergencyAccessBodySchema,
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
    summary: 'Generate or regenerate emergency QR access link with PIN',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        generateEmergencyAccessBodySchema,
        'Emergency access PIN'
      ),
    },
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

  getPublicChallenge: createRoute({
    method: 'get',
    tags: ['Emergency Access'],
    path: '/emergency-access/public/{token}',
    summary: 'Get emergency access challenge metadata (no PHI)',
    request: {
      params: emergencyAccessTokenParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(publicEmergencyChallengeSchema),
        'Emergency access challenge'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid or revoked token'
      ),
    },
  }),

  unlockPublicRecords: createRoute({
    method: 'post',
    tags: ['Emergency Access'],
    path: '/emergency-access/public/{token}/unlock',
    summary: 'Unlock emergency medical records with PIN',
    request: {
      params: emergencyAccessTokenParamSchema,
      body: jsonContentRequired(
        unlockEmergencyAccessBodySchema,
        'Emergency access PIN'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(publicEmergencyRecordsSchema),
        'Emergency medical records'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid PIN'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid or revoked token'
      ),
      [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Too many failed attempts'
      ),
    },
  }),
}
