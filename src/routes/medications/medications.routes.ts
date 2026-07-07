import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createMedicationBodySchema,
  medicationIdParamSchema,
  medicationSchema,
  medicationsListSchema,
  messageResponseSchema,
  updateMedicationBodySchema,
} from '~/routes/medications/medications.schemas'

export const MEDICATIONS_ROUTES = {
  listMedications: createRoute({
    method: 'get',
    tags: ['Medications'],
    path: '/medications',
    summary: 'List medications for the current patient',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(medicationsListSchema),
        'Medications list'
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

  createMedication: createRoute({
    method: 'post',
    tags: ['Medications'],
    path: '/medications',
    summary: 'Create a medication',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        createMedicationBodySchema,
        'Create medication payload'
      ),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(medicationSchema),
        'Medication created'
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

  updateMedication: createRoute({
    method: 'patch',
    tags: ['Medications'],
    path: '/medications/{id}',
    summary: 'Update a medication',
    security: [{ bearerAuth: [] }],
    request: {
      params: medicationIdParamSchema,
      body: jsonContentRequired(
        updateMedicationBodySchema,
        'Update medication payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(medicationSchema),
        'Medication updated'
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

  deleteMedication: createRoute({
    method: 'delete',
    tags: ['Medications'],
    path: '/medications/{id}',
    summary: 'Delete a medication',
    security: [{ bearerAuth: [] }],
    request: {
      params: medicationIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Medication deleted'
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
