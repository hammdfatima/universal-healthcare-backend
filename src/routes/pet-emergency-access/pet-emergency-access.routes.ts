import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  generatePetEmergencyAccessBodySchema,
  petEmergencyAccessPetIdParamSchema,
  petEmergencyAccessStatusSchema,
  petEmergencyAccessTokenParamSchema,
  petEmergencyAccessTokenSchema,
  petEmergencyMessageResponseSchema,
  publicPetEmergencyChallengeSchema,
  publicPetEmergencyRecordsSchema,
  unlockPetEmergencyAccessBodySchema,
} from '~/routes/pet-emergency-access/pet-emergency-access.schemas'

export const PET_EMERGENCY_ACCESS_ROUTES = {
  getStatus: createRoute({
    method: 'get',
    tags: ['Pet Emergency Access'],
    path: '/pets/{petId}/emergency-access',
    summary: 'Get pet emergency QR access status',
    security: [{ bearerAuth: [] }],
    request: {
      params: petEmergencyAccessPetIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(petEmergencyAccessStatusSchema),
        'Pet emergency access status'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  generate: createRoute({
    method: 'post',
    tags: ['Pet Emergency Access'],
    path: '/pets/{petId}/emergency-access/generate',
    summary: 'Generate or regenerate pet emergency QR access with PIN',
    security: [{ bearerAuth: [] }],
    request: {
      params: petEmergencyAccessPetIdParamSchema,
      body: jsonContentRequired(
        generatePetEmergencyAccessBodySchema,
        'Pet emergency access PIN'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(petEmergencyAccessTokenSchema),
        'Pet emergency access generated'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  revoke: createRoute({
    method: 'delete',
    tags: ['Pet Emergency Access'],
    path: '/pets/{petId}/emergency-access',
    summary: 'Revoke pet emergency QR access',
    security: [{ bearerAuth: [] }],
    request: {
      params: petEmergencyAccessPetIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Pet emergency access revoked'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Not found'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  getPublicChallenge: createRoute({
    method: 'get',
    tags: ['Pet Emergency Access'],
    path: '/pets/emergency-access/public/{token}',
    summary: 'Get pet emergency access challenge metadata (no PHI)',
    request: {
      params: petEmergencyAccessTokenParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(publicPetEmergencyChallengeSchema),
        'Pet emergency access challenge'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Invalid or revoked token'
      ),
    },
  }),

  unlockPublicRecords: createRoute({
    method: 'post',
    tags: ['Pet Emergency Access'],
    path: '/pets/emergency-access/public/{token}/unlock',
    summary: 'Unlock pet emergency profile with PIN',
    request: {
      params: petEmergencyAccessTokenParamSchema,
      body: jsonContentRequired(
        unlockPetEmergencyAccessBodySchema,
        'Pet emergency access PIN'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(publicPetEmergencyRecordsSchema),
        'Pet emergency profile'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Invalid PIN'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Invalid or revoked token'
      ),
      [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
        zodResponseSchema(petEmergencyMessageResponseSchema),
        'Too many failed attempts'
      ),
    },
  }),
}
