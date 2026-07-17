import { z } from '@hono/zod-openapi'
import { strongPasswordSchema } from '~/lib/password-policy'

export const familyMemberSchema = z
  .object({
    id: z.string(),
    memberUserId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    relationship: z.string(),
    isEmergencyContact: z.boolean(),
    isAccessible: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('FamilyMember')

export const familyMembersListSchema = z
  .object({
    members: z.array(familyMemberSchema),
    limit: z.number().int(),
    usedSeats: z.number().int(),
    petCount: z.number().int(),
    pausedPetCount: z.number().int(),
    canManage: z.boolean(),
    supportsPets: z.boolean(),
  })
  .openapi('FamilyMembersList')

export const createFamilyMemberBodySchema = z
  .object({
    firstName: z.string().min(1).openapi({ example: 'Sarah' }),
    lastName: z.string().min(1).openapi({ example: 'Smith' }),
    email: z.email().openapi({ example: 'sarah@example.com' }),
    phone: z.string().min(1).openapi({ example: '(555) 234-5678' }),
    relationship: z.string().min(1).openapi({ example: 'Spouse' }),
    password: strongPasswordSchema.openapi({ example: 'TempPass1!' }),
    isEmergencyContact: z.boolean().default(false),
  })
  .openapi('CreateFamilyMemberBody')

export const updateFamilyMemberBodySchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(1),
    relationship: z.string().min(1),
    isEmergencyContact: z.boolean(),
  })
  .openapi('UpdateFamilyMemberBody')

export const familyMemberIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('FamilyMemberMessageResponse')
