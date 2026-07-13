import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createPetBodySchema,
  messageResponseSchema,
  petIdParamSchema,
  petSchema,
  petsListSchema,
  updatePetBodySchema,
} from '~/routes/pets/pets.schemas'

export const PETS_ROUTES = {
  listPets: createRoute({
    method: 'get',
    tags: ['Pets'],
    path: '/pets',
    summary: 'List pets for the current account owner',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(petsListSchema),
        'Pets list'
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

  createPet: createRoute({
    method: 'post',
    tags: ['Pets'],
    path: '/pets',
    summary: 'Create a pet profile (no login account)',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(createPetBodySchema, 'Create pet payload'),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(petSchema),
        'Pet created'
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

  updatePet: createRoute({
    method: 'patch',
    tags: ['Pets'],
    path: '/pets/{id}',
    summary: 'Update a pet profile',
    security: [{ bearerAuth: [] }],
    request: {
      params: petIdParamSchema,
      body: jsonContentRequired(updatePetBodySchema, 'Update pet payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(petSchema), 'Pet updated'),
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

  deletePet: createRoute({
    method: 'delete',
    tags: ['Pets'],
    path: '/pets/{id}',
    summary: 'Delete a pet profile',
    security: [{ bearerAuth: [] }],
    request: {
      params: petIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Pet deleted'
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
