import { z } from '@hono/zod-openapi'
import { patientDataExportSchema } from '~/routes/patient-settings/patient-settings.schemas'

export const emergencyAccessTokenSchema = z
  .object({
    token: z.string(),
    accessUrl: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastAccessedAt: z.string().nullable(),
  })
  .openapi('EmergencyAccessToken')

export const emergencyAccessStatusSchema = z
  .object({
    hasToken: z.boolean(),
    access: emergencyAccessTokenSchema.nullable(),
  })
  .openapi('EmergencyAccessStatus')

export const emergencyAccessTokenParamSchema = z
  .object({
    token: z.string().min(1).openapi({ example: 'abc123def456' }),
  })
  .openapi('EmergencyAccessTokenParam')

export const publicEmergencyRecordsSchema = patientDataExportSchema
  .extend({
    patientName: z.string(),
    accessedAt: z.string(),
  })
  .openapi('PublicEmergencyRecords')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('EmergencyAccessMessageResponse')
