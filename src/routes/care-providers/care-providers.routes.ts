import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  careProviderIdParamSchema,
  careProviderSchema,
  careProvidersListSchema,
  createCareProviderBodySchema,
  messageResponseSchema,
  updateCareProviderBodySchema,
} from '~/routes/care-providers/care-providers.schemas'

export const CARE_PROVIDERS_ROUTES = {
  listCareProviders: createRoute({
    method: 'get',
    tags: ['Care Providers'],
    path: '/care-providers',
    summary: 'List care providers for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(careProvidersListSchema),
        'Care providers list'
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

  createCareProvider: createRoute({
    method: 'post',
    tags: ['Care Providers'],
    path: '/care-providers',
    summary: 'Create a care provider',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        createCareProviderBodySchema,
        'Create care provider payload'
      ),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(careProviderSchema),
        'Care provider created'
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

  updateCareProvider: createRoute({
    method: 'patch',
    tags: ['Care Providers'],
    path: '/care-providers/{id}',
    summary: 'Update a care provider',
    security: [{ bearerAuth: [] }],
    request: {
      params: careProviderIdParamSchema,
      body: jsonContentRequired(
        updateCareProviderBodySchema,
        'Update care provider payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(careProviderSchema),
        'Care provider updated'
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

  deleteCareProvider: createRoute({
    method: 'delete',
    tags: ['Care Providers'],
    path: '/care-providers/{id}',
    summary: 'Delete a care provider',
    security: [{ bearerAuth: [] }],
    request: {
      params: careProviderIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Care provider deleted'
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
