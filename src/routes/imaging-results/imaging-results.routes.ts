import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createImagingResultBodySchema,
  imagingResultIdParamSchema,
  imagingResultSchema,
  imagingResultsListSchema,
  messageResponseSchema,
  updateImagingResultBodySchema,
} from '~/routes/imaging-results/imaging-results.schemas'

export const IMAGING_RESULTS_ROUTES = {
  listImagingResults: createRoute({
    method: 'get',
    tags: ['Imaging Results'],
    path: '/imaging-results',
    summary: 'List imaging results for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(imagingResultsListSchema),
        'Imaging results list'
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

  createImagingResult: createRoute({
    method: 'post',
    tags: ['Imaging Results'],
    path: '/imaging-results',
    summary: 'Create an imaging result record',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        createImagingResultBodySchema,
        'Create imaging result payload'
      ),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(imagingResultSchema),
        'Imaging result created'
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

  updateImagingResult: createRoute({
    method: 'patch',
    tags: ['Imaging Results'],
    path: '/imaging-results/{id}',
    summary: 'Update an imaging result record',
    security: [{ bearerAuth: [] }],
    request: {
      params: imagingResultIdParamSchema,
      body: jsonContentRequired(
        updateImagingResultBodySchema,
        'Update imaging result payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(imagingResultSchema),
        'Imaging result updated'
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

  deleteImagingResult: createRoute({
    method: 'delete',
    tags: ['Imaging Results'],
    path: '/imaging-results/{id}',
    summary: 'Delete an imaging result record',
    security: [{ bearerAuth: [] }],
    request: {
      params: imagingResultIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Imaging result deleted'
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
