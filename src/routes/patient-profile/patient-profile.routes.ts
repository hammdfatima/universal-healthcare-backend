import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  completeOnboardingBodySchema,
  messageResponseSchema,
  patientProfileSchema,
} from '~/routes/patient-profile/patient-profile.schemas'

export const PATIENT_PROFILE_ROUTES = {
  getProfile: createRoute({
    method: 'get',
    tags: ['Patient Profile'],
    path: '/profile',
    summary: 'Get patient profile',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(patientProfileSchema),
        'Patient profile'
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

  completeOnboarding: createRoute({
    method: 'patch',
    tags: ['Patient Profile'],
    path: '/profile/onboarding',
    summary: 'Complete patient onboarding',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        completeOnboardingBodySchema,
        'Patient onboarding payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(patientProfileSchema),
        'Onboarding completed'
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
