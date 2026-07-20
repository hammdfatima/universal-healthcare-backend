import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createPharmacyBodySchema,
  messageResponseSchema,
  pharmaciesListSchema,
  pharmacyIdParamSchema,
  pharmacySchema,
  updatePharmacyBodySchema,
} from '~/routes/pharmacies/pharmacies.schemas'

export const PHARMACIES_ROUTES = {
  listPharmacies: createRoute({
    method: 'get',
    tags: ['Pharmacies'],
    path: '/pharmacies',
    summary: 'List preferred pharmacies for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(pharmaciesListSchema),
        'Pharmacies list'
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

  createPharmacy: createRoute({
    method: 'post',
    tags: ['Pharmacies'],
    path: '/pharmacies',
    summary: 'Create a preferred pharmacy',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(createPharmacyBodySchema, 'Create pharmacy payload'),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(pharmacySchema),
        'Pharmacy created'
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

  updatePharmacy: createRoute({
    method: 'patch',
    tags: ['Pharmacies'],
    path: '/pharmacies/{id}',
    summary: 'Update a preferred pharmacy',
    security: [{ bearerAuth: [] }],
    request: {
      params: pharmacyIdParamSchema,
      body: jsonContentRequired(updatePharmacyBodySchema, 'Update pharmacy payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(pharmacySchema), 'Pharmacy updated'),
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

  deletePharmacy: createRoute({
    method: 'delete',
    tags: ['Pharmacies'],
    path: '/pharmacies/{id}',
    summary: 'Delete a preferred pharmacy',
    security: [{ bearerAuth: [] }],
    request: {
      params: pharmacyIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Pharmacy deleted'
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
