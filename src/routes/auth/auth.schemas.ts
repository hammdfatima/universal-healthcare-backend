import { z } from '@hono/zod-openapi'
import { USER_ROLES } from '~/config/roles'
import { strongPasswordSchema } from '~/lib/password-policy'

export const signupBodySchema = z
  .object({
    firstName: z.string().min(1).openapi({ example: 'John' }),
    lastName: z.string().min(1).openapi({ example: 'Smith' }),
    email: z.email().openapi({ example: 'john@example.com' }),
    password: strongPasswordSchema.openapi({ example: 'Password1!' }),
  })
  .openapi('SignupBody')

export const loginBodySchema = z
  .object({
    email: z.email().openapi({ example: 'john@example.com' }),
    password: z.string().min(8).openapi({ example: 'password123' }),
  })
  .openapi('LoginBody')

export const emailOnlyBodySchema = z
  .object({
    email: z.email().openapi({ example: 'john@example.com' }),
  })
  .openapi('EmailOnlyBody')

export const verifyEmailBodySchema = z
  .object({
    email: z.email().openapi({ example: 'john@example.com' }),
    otp: z.string().length(6).openapi({ example: '123456' }),
  })
  .openapi('VerifyEmailBody')

export const verifyResetOtpBodySchema = z
  .object({
    email: z.email().openapi({ example: 'john@example.com' }),
    otp: z.string().length(6).openapi({ example: '123456' }),
  })
  .openapi('VerifyResetOtpBody')

export const resetPasswordBodySchema = z
  .object({
    token: z.string().min(1).openapi({ description: 'Password reset JWT' }),
    password: strongPasswordSchema.openapi({ example: 'Password1!' }),
  })
  .openapi('ResetPasswordBody')

export const authUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    name: z.string().nullable(),
    profileImage: z.string().nullable(),
    role: z.enum([USER_ROLES.USER, USER_ROLES.ADMIN]),
    emailVerified: z.boolean(),
  })
  .openapi('AuthUser')

export const authTokenResponseSchema = z
  .object({
    token: z.string(),
    user: authUserSchema,
  })
  .openapi('AuthTokenResponse')

export const resetTokenResponseSchema = z
  .object({
    resetToken: z.string(),
  })
  .openapi('ResetTokenResponse')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('MessageResponse')
