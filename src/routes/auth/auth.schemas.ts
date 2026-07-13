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
  .strict()
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

export const verifyMfaLoginBodySchema = z
  .object({
    mfaToken: z.string().min(1),
    code: z
      .string()
      .regex(/^\d{6}$/, 'Authenticator code must be 6 digits')
      .openapi({ example: '123456' }),
  })
  .openapi('VerifyMfaLoginBody')

export const enableMfaBodySchema = z
  .object({
    code: z
      .string()
      .regex(/^\d{6}$/, 'Authenticator code must be 6 digits')
      .openapi({ example: '123456' }),
  })
  .openapi('EnableMfaBody')

export const disableMfaBodySchema = z
  .object({
    code: z
      .string()
      .regex(/^\d{6}$/, 'Authenticator code must be 6 digits')
      .openapi({ example: '123456' }),
    password: z.string().min(8),
  })
  .openapi('DisableMfaBody')

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
    mustChangePassword: z.boolean(),
    isFamilyMemberAccount: z.boolean(),
    mfaEnabled: z.boolean(),
  })
  .openapi('AuthUser')

export const signupAuthUserSchema = authUserSchema
  .omit({ role: true })
  .extend({
    role: z.literal(USER_ROLES.USER),
  })
  .openapi('SignupAuthUser')

export const sessionUserResponseSchema = z
  .object({
    mfaRequired: z.literal(false),
    user: authUserSchema,
  })
  .openapi('SessionUserResponse')

export const signupSessionUserResponseSchema = z
  .object({
    mfaRequired: z.literal(false),
    user: signupAuthUserSchema,
  })
  .openapi('SignupSessionUserResponse')

export const mfaChallengeResponseSchema = z
  .object({
    mfaRequired: z.literal(true),
    mfaToken: z.string(),
  })
  .openapi('MfaChallengeResponse')

export const loginResponseSchema = z
  .union([sessionUserResponseSchema, mfaChallengeResponseSchema])
  .openapi('LoginResponse')

export const mfaStatusSchema = z
  .object({
    mfaEnabled: z.boolean(),
  })
  .openapi('MfaStatus')

export const mfaSetupSchema = z
  .object({
    secret: z.string(),
    otpauthUrl: z.string(),
  })
  .openapi('MfaSetup')

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

export const sessionResponseSchema = z
  .object({
    valid: z.literal(true),
    user: authUserSchema,
  })
  .openapi('SessionResponse')
