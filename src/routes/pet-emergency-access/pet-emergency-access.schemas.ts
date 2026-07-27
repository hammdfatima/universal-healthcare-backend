import { z } from '@hono/zod-openapi'
import { petSchema } from '~/routes/pets/pets.schemas'

export const petEmergencyAccessTokenSchema = z
  .object({
    token: z.string(),
    accessUrl: z.string(),
    isActive: z.boolean(),
    expiresAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastAccessedAt: z.string().nullable(),
  })
  .openapi('PetEmergencyAccessToken')

export const petEmergencyAccessStatusSchema = z
  .object({
    hasToken: z.boolean(),
    access: petEmergencyAccessTokenSchema.nullable(),
  })
  .openapi('PetEmergencyAccessStatus')

export const petEmergencyAccessPetIdParamSchema = z
  .object({
    petId: z.string().min(1),
  })
  .openapi('PetEmergencyAccessPetIdParam')

export const petEmergencyAccessTokenParamSchema = z
  .object({
    token: z.string().min(1).openapi({ example: 'abc123def456' }),
  })
  .openapi('PetEmergencyAccessTokenParam')

export const generatePetEmergencyAccessBodySchema = z
  .object({
    pin: z
      .string()
      .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
      .openapi({ example: '4829' }),
  })
  .openapi('GeneratePetEmergencyAccessBody')

export const unlockPetEmergencyAccessBodySchema = z
  .object({
    pin: z
      .string()
      .regex(/^\d{4}$/, 'PIN must be exactly 4 digits')
      .openapi({ example: '4829' }),
  })
  .openapi('UnlockPetEmergencyAccessBody')

export const publicPetEmergencyChallengeSchema = z
  .object({
    needsPin: z.literal(true),
    petInitials: z.string(),
    petNameHint: z.string(),
    expiresAt: z.string(),
  })
  .openapi('PublicPetEmergencyChallenge')

export const publicPetEmergencyRecordsSchema = petSchema
  .extend({
    accessedAt: z.string(),
  })
  .openapi('PublicPetEmergencyRecords')

export const petEmergencyMessageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('PetEmergencyAccessMessageResponse')
