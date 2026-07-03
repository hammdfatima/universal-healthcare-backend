import { z } from '@hono/zod-openapi'

export const adminProfileBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'Admin User' }),
    email: z.email().openapi({ example: 'admin@uhc.com' }),
    phone: z.string().min(1).openapi({ example: '(555) 000-1000' }),
  })
  .openapi('AdminProfileBody')

export const adminProfileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    emailVerified: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('AdminProfile')

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1).openapi({ example: 'currentpassword' }),
    newPassword: z.string().min(8).openapi({ example: 'newpassword123' }),
  })
  .openapi('AdminChangePasswordBody')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('AdminProfileMessageResponse')
