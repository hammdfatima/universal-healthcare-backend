import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  accessiblePatientsSchema,
  messageResponseSchema,
  sharingSettingsSchema,
  sidebarFamilySchema,
  updateSharingBodySchema,
} from '~/routes/medical-record-shares/medical-record-shares.schemas'

export const MEDICAL_RECORD_SHARES_ROUTES = {
  getSharingSettings: createRoute({
    method: 'get',
    tags: ['Medical Record Sharing'],
    path: '/medical-record-shares/settings',
    summary: 'Get my medical record sharing settings',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(sharingSettingsSchema),
        'Sharing settings'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  updateSharingSettings: createRoute({
    method: 'put',
    tags: ['Medical Record Sharing'],
    path: '/medical-record-shares/settings',
    summary: 'Update my medical record sharing settings',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(updateSharingBodySchema, 'Sharing settings payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(sharingSettingsSchema),
        'Updated sharing settings'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid request'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  listSidebarFamily: createRoute({
    method: 'get',
    tags: ['Medical Record Sharing'],
    path: '/medical-record-shares/sidebar-family',
    summary: 'List family members for the patient sidebar',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(sidebarFamilySchema),
        'Sidebar family list'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  listAccessiblePatients: createRoute({
    method: 'get',
    tags: ['Medical Record Sharing'],
    path: '/medical-record-shares/accessible-patients',
    summary: 'List patients whose medical records I can view',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(accessiblePatientsSchema),
        'Accessible patients'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),
}
