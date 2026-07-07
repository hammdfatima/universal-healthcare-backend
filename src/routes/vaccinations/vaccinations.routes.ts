import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createVaccinationBodySchema,
  messageResponseSchema,
  updateVaccinationBodySchema,
  vaccinationIdParamSchema,
  vaccinationSchema,
  vaccinationsListSchema,
} from '~/routes/vaccinations/vaccinations.schemas'

export const VACCINATIONS_ROUTES = {
  listVaccinations: createRoute({
    method: 'get',
    tags: ['Vaccinations'],
    path: '/vaccinations',
    summary: 'List vaccinations for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(vaccinationsListSchema),
        'Vaccinations list'
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

  createVaccination: createRoute({
    method: 'post',
    tags: ['Vaccinations'],
    path: '/vaccinations',
    summary: 'Create a vaccination record',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        createVaccinationBodySchema,
        'Create vaccination payload'
      ),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(vaccinationSchema),
        'Vaccination created'
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

  updateVaccination: createRoute({
    method: 'patch',
    tags: ['Vaccinations'],
    path: '/vaccinations/{id}',
    summary: 'Update a vaccination record',
    security: [{ bearerAuth: [] }],
    request: {
      params: vaccinationIdParamSchema,
      body: jsonContentRequired(
        updateVaccinationBodySchema,
        'Update vaccination payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(vaccinationSchema),
        'Vaccination updated'
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

  deleteVaccination: createRoute({
    method: 'delete',
    tags: ['Vaccinations'],
    path: '/vaccinations/{id}',
    summary: 'Delete a vaccination record',
    security: [{ bearerAuth: [] }],
    request: {
      params: vaccinationIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Vaccination deleted'
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
