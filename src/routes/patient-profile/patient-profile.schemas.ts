import { z } from '@hono/zod-openapi'

export const bloodGroupValues = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'Unknown',
] as const

export const genderValues = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say',
] as const

export const completeOnboardingBodySchema = z
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
  .openapi('CompleteOnboardingBody')

export const patientProfileSchema = z
  .object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().email(),
    phone: z.string().nullable(),
    profileImage: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    bloodGroup: z.string().nullable(),
    gender: z.string().nullable(),
    address: z.string().nullable(),
    onboardingCompleted: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('PatientProfile')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('PatientProfileMessageResponse')
