import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  familyLifestyleHistoryResponseSchema,
  messageResponseSchema,
  upsertFamilyLifestyleHistoryBodySchema,
} from '~/routes/family-lifestyle-history/family-lifestyle-history.schemas'

export const FAMILY_LIFESTYLE_HISTORY_ROUTES = {
  getFamilyLifestyleHistory: createRoute({
    method: 'get',
    tags: ['Family Lifestyle History'],
    path: '/family-lifestyle-history',
    summary: 'Get family and lifestyle history for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(familyLifestyleHistoryResponseSchema),
        'Family and lifestyle history'
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

  upsertFamilyLifestyleHistory: createRoute({
    method: 'put',
    tags: ['Family Lifestyle History'],
    path: '/family-lifestyle-history',
    summary: 'Create or update family and lifestyle history',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        upsertFamilyLifestyleHistoryBodySchema,
        'Family and lifestyle history payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(familyLifestyleHistoryResponseSchema),
        'Family and lifestyle history saved'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid request'
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
