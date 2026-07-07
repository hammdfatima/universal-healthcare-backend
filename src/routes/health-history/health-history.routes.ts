import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createHealthHistoryBodySchema,
  healthHistoryEntrySchema,
  healthHistoryIdParamSchema,
  healthHistoryListSchema,
  messageResponseSchema,
  updateHealthHistoryBodySchema,
} from '~/routes/health-history/health-history.schemas'

export const HEALTH_HISTORY_ROUTES = {
  listHealthHistoryEntries: createRoute({
    method: 'get',
    tags: ['Health History'],
    path: '/health-history',
    summary: 'List health history entries for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(healthHistoryListSchema),
        'Health history list'
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

  createHealthHistoryEntry: createRoute({
    method: 'post',
    tags: ['Health History'],
    path: '/health-history',
    summary: 'Create a health history entry',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        createHealthHistoryBodySchema,
        'Create health history payload'
      ),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(healthHistoryEntrySchema),
        'Health history entry created'
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

  updateHealthHistoryEntry: createRoute({
    method: 'patch',
    tags: ['Health History'],
    path: '/health-history/{id}',
    summary: 'Update a health history entry',
    security: [{ bearerAuth: [] }],
    request: {
      params: healthHistoryIdParamSchema,
      body: jsonContentRequired(
        updateHealthHistoryBodySchema,
        'Update health history payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(healthHistoryEntrySchema),
        'Health history entry updated'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Not found'
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

  deleteHealthHistoryEntry: createRoute({
    method: 'delete',
    tags: ['Health History'],
    path: '/health-history/{id}',
    summary: 'Delete a health history entry',
    security: [{ bearerAuth: [] }],
    request: {
      params: healthHistoryIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Health history entry deleted'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Not found'
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
