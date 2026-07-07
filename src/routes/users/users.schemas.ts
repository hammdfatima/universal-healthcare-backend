import { z } from '@hono/zod-openapi'
import { USER_ROLES } from '~/config/roles'

export const userStatusSchema = z.enum(['active', 'inactive', 'cancelled', 'blocked'])

export const adminUserAddedBySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  })
  .openapi('AdminUserAddedBy')

export const adminUserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    profileImage: z.string().nullable(),
    plan: z.string().nullable(),
    status: userStatusSchema,
    isBlocked: z.boolean(),
    emailVerified: z.boolean(),
    role: z.enum([USER_ROLES.USER, USER_ROLES.ADMIN]),
    createdAt: z.string(),
    updatedAt: z.string(),
    isFamilyMemberAccount: z.boolean(),
    addedBy: adminUserAddedBySchema.nullable(),
    familyMemberCount: z.number().int().nonnegative(),
    familyMemberLimit: z.number().int().nonnegative(),
    canAddFamilyMembers: z.boolean(),
    familyMembersRemaining: z.number().int().nonnegative(),
  })
  .openapi('AdminUser')

export const adminUserListSchema = z.array(adminUserSchema)

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('AdminUserMessageResponse')
