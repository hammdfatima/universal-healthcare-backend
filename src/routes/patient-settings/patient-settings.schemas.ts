import { z } from '@hono/zod-openapi'
import { strongPasswordSchema } from '~/lib/password-policy'
import {
  bloodGroupValues,
  genderValues,
} from '~/routes/patient-profile/patient-profile.schemas'
import { patientProfileSchema } from '~/routes/patient-profile/patient-profile.schemas'

export const accountSettingsSchema = z
  .object({
    emailNotifications: z.boolean(),
    marketingEmails: z.boolean(),
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
    dateOfBirth: z.string().datetime().openapi({ example: '1985-03-15T00:00:00.000Z' }),
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

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('PatientSettingsMessageResponse')
