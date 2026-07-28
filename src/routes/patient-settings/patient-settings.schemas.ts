import { z } from '@hono/zod-openapi'
import { strongPasswordSchema } from '~/lib/password-policy'
import {
  bloodGroupValues,
  genderValues,
  patientProfileSchema,
} from '~/routes/patient-profile/patient-profile.schemas'

export const accountSettingsSchema = z
  .object({
    emailNotifications: z.boolean(),
    inAppNotifications: z.boolean(),
  })
  .openapi('AccountSettings')

export const patientSettingsSchema = z
  .object({
    profile: patientProfileSchema,
    account: accountSettingsSchema,
  })
  .openapi('PatientSettings')

export const updateProfileBodySchema = z
  .object({
    firstName: z.string().min(1).openapi({ example: 'John' }),
    lastName: z.string().min(1).openapi({ example: 'Smith' }),
    phone: z.string().min(1).openapi({ example: '(555) 123-4567' }),
    profileImage: z.string().optional().openapi({
      example: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
    }),
    bloodGroup: z.enum(bloodGroupValues).openapi({ example: 'O+' }),
    gender: z.enum(genderValues).openapi({ example: 'Male' }),
    address: z.string().openapi({ example: '123 Wellness Street, Health City' }),
  })
  .openapi('UpdatePatientProfileBody')

export const updateAccountSettingsBodySchema = accountSettingsSchema.openapi(
  'UpdateAccountSettingsBody'
)

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1).openapi({ example: 'currentpassword' }),
    newPassword: strongPasswordSchema.openapi({ example: 'Password1!' }),
  })
  .openapi('PatientChangePasswordBody')

export const deleteAccountBodySchema = z
  .object({
    confirmation: z.literal('DELETE'),
    stepUpToken: z.string().min(1).optional().openapi({
      description: 'Step-up token obtained from POST /auth/step-up/verify',
    }),
  })
  .openapi('DeleteAccountBody')

export const exportDataQuerySchema = z.object({
  stepUpToken: z.string().min(1).optional().openapi({
    description: 'Step-up token obtained from POST /auth/step-up/verify',
  }),
})

export const authSessionSchema = z
  .object({
    id: z.string(),
    sessionId: z.string(),
    ip: z.string().nullable(),
    userAgent: z.string().nullable(),
    lastSeenAt: z.string(),
    createdAt: z.string(),
    isCurrent: z.boolean(),
  })
  .openapi('AuthSession')

export const authSessionsListSchema = z
  .object({
    sessions: z.array(authSessionSchema),
  })
  .openapi('AuthSessionsList')

export const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1),
})

export const patientDataExportSchema = z
  .object({
    exportedAt: z.string(),
    profile: z.record(z.string(), z.unknown()),
    medications: z.array(z.record(z.string(), z.unknown())),
    allergies: z.array(z.record(z.string(), z.unknown())),
    healthHistory: z.array(z.record(z.string(), z.unknown())),
    vaccinations: z.array(z.record(z.string(), z.unknown())),
    labResults: z.array(z.record(z.string(), z.unknown())),
    imagingResults: z.array(z.record(z.string(), z.unknown())),
    careProviders: z.array(z.record(z.string(), z.unknown())),
    pharmacies: z.array(z.record(z.string(), z.unknown())),
    familyLifestyleHistory: z.record(z.string(), z.unknown()),
    familyMembers: z.array(z.record(z.string(), z.unknown())),
  })
  .openapi('PatientDataExport')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('PatientSettingsMessageResponse')
