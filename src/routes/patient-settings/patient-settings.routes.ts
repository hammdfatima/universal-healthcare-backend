import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  authSessionsListSchema,
  changePasswordBodySchema,
  deleteAccountBodySchema,
  exportDataQuerySchema,
  messageResponseSchema,
  patientDataExportSchema,
  patientSettingsSchema,
  sessionIdParamSchema,
  updateAccountSettingsBodySchema,
  updateProfileBodySchema,
} from '~/routes/patient-settings/patient-settings.schemas'

export const PATIENT_SETTINGS_ROUTES = {
  getSettings: createRoute({
    method: 'get',
    tags: ['Patient Settings'],
    path: '/settings',
    summary: 'Get patient settings',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(patientSettingsSchema),
        'Patient settings'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  updateProfile: createRoute({
    method: 'patch',
    tags: ['Patient Settings'],
    path: '/settings/profile',
    summary: 'Update patient profile settings',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(updateProfileBodySchema, 'Profile update payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(patientSettingsSchema),
        'Profile updated'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  updateAccount: createRoute({
    method: 'patch',
    tags: ['Patient Settings'],
    path: '/settings/account',
    summary: 'Update patient account preferences',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        updateAccountSettingsBodySchema,
        'Account settings payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(patientSettingsSchema),
        'Account settings updated'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  changePassword: createRoute({
    method: 'post',
    tags: ['Patient Settings'],
    path: '/settings/change-password',
    summary: 'Change patient password',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(changePasswordBodySchema, 'Change password payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Password updated'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid password'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  exportData: createRoute({
    method: 'get',
    tags: ['Patient Settings'],
    path: '/settings/export',
    summary: 'Export patient health data',
    description: 'Requires a step-up token from POST /auth/step-up/verify (HIPAA §2.4).',
    security: [{ bearerAuth: [] }],
    request: {
      query: exportDataQuerySchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(patientDataExportSchema),
        'Patient data export'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Step-up authentication required'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  deleteAccount: createRoute({
    method: 'post',
    tags: ['Patient Settings'],
    path: '/settings/delete-account',
    summary: 'Permanently delete patient account',
    description: 'Requires a step-up token from POST /auth/step-up/verify (HIPAA §2.4).',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(deleteAccountBodySchema, 'Delete account confirmation'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Account deleted'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid confirmation'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Step-up authentication required'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  listSessions: createRoute({
    method: 'get',
    tags: ['Patient Settings'],
    path: '/settings/sessions',
    summary: 'List active sessions for the current account (HIPAA §2.5)',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(authSessionsListSchema),
        'Active sessions'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  revokeSession: createRoute({
    method: 'delete',
    tags: ['Patient Settings'],
    path: '/settings/sessions/{sessionId}',
    summary: 'Revoke an active session',
    security: [{ bearerAuth: [] }],
    request: {
      params: sessionIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Session revoked'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Session not found'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),
}
