import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createLabResultBodySchema,
  labResultIdParamSchema,
  labResultSchema,
  labResultsListSchema,
  messageResponseSchema,
  updateLabResultBodySchema,
} from '~/routes/lab-results/lab-results.schemas'

export const LAB_RESULTS_ROUTES = {
  listLabResults: createRoute({
    method: 'get',
    tags: ['Lab Results'],
    path: '/lab-results',
    summary: 'List lab results for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(labResultsListSchema),
        'Lab results list'
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

  createLabResult: createRoute({
    method: 'post',
    tags: ['Lab Results'],
    path: '/lab-results',
    summary: 'Create a lab result record',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(createLabResultBodySchema, 'Create lab result payload'),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(labResultSchema),
        'Lab result created'
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

  updateLabResult: createRoute({
    method: 'patch',
    tags: ['Lab Results'],
    path: '/lab-results/{id}',
    summary: 'Update a lab result record',
    security: [{ bearerAuth: [] }],
    request: {
      params: labResultIdParamSchema,
      body: jsonContentRequired(updateLabResultBodySchema, 'Update lab result payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(labResultSchema),
        'Lab result updated'
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

  deleteLabResult: createRoute({
    method: 'delete',
    tags: ['Lab Results'],
    path: '/lab-results/{id}',
    summary: 'Delete a lab result record',
    security: [{ bearerAuth: [] }],
    request: {
      params: labResultIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Lab result deleted'
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
