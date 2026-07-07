import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  allergiesListSchema,
  allergyIdParamSchema,
  allergySchema,
  createAllergyBodySchema,
  messageResponseSchema,
  updateAllergyBodySchema,
} from '~/routes/allergies/allergies.schemas'

export const ALLERGIES_ROUTES = {
  listAllergies: createRoute({
    method: 'get',
    tags: ['Allergies'],
    path: '/allergies',
    summary: 'List allergies for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(allergiesListSchema),
        'Allergies list'
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

  createAllergy: createRoute({
    method: 'post',
    tags: ['Allergies'],
    path: '/allergies',
    summary: 'Create an allergy record',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(createAllergyBodySchema, 'Create allergy payload'),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(allergySchema),
        'Allergy created'
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

  updateAllergy: createRoute({
    method: 'patch',
    tags: ['Allergies'],
    path: '/allergies/{id}',
    summary: 'Update an allergy record',
    security: [{ bearerAuth: [] }],
    request: {
      params: allergyIdParamSchema,
      body: jsonContentRequired(updateAllergyBodySchema, 'Update allergy payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(allergySchema),
        'Allergy updated'
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

  deleteAllergy: createRoute({
    method: 'delete',
    tags: ['Allergies'],
    path: '/allergies/{id}',
    summary: 'Delete an allergy record',
    security: [{ bearerAuth: [] }],
    request: {
      params: allergyIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Allergy deleted'
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
