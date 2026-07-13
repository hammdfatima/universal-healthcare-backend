import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  disableMfaBodySchema,
  emailOnlyBodySchema,
  enableMfaBodySchema,
  loginBodySchema,
  loginResponseSchema,
  messageResponseSchema,
  mfaSetupSchema,
  mfaStatusSchema,
  resetPasswordBodySchema,
  resetTokenResponseSchema,
  sessionResponseSchema,
  sessionUserResponseSchema,
  signupBodySchema,
  signupSessionUserResponseSchema,
  verifyEmailBodySchema,
  verifyMfaLoginBodySchema,
  verifyResetOtpBodySchema,
} from '~/routes/auth/auth.schemas'

export const AUTH_ROUTES = {
  signup: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/signup',
    summary: 'Sign up',
    description:
      'Create a new patient (USER) account and send an email verification code. Admin accounts cannot be created through this endpoint.',
    request: {
      body: jsonContentRequired(signupBodySchema, 'Signup credentials'),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Account created; verification code sent'
      ),
      [HttpStatusCodes.CONFLICT]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Email already registered'
      ),
    },
  }),

  login: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/login',
    summary: 'Log in',
    request: {
      body: jsonContentRequired(loginBodySchema, 'Login credentials'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(loginResponseSchema),
        'Login successful or MFA required'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid credentials'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Email not verified'
      ),
      [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Rate limited'
      ),
    },
  }),

  verifyMfaLogin: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/mfa/verify-login',
    summary: 'Complete login with authenticator code',
    request: {
      body: jsonContentRequired(verifyMfaLoginBodySchema, 'MFA login payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(sessionUserResponseSchema),
        'Login successful'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid MFA code'
      ),
      [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Rate limited'
      ),
    },
  }),

  verifyEmail: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/verify-email',
    summary: 'Verify email',
    description: 'Verify a signup email with the 6-digit OTP.',
    request: {
      body: jsonContentRequired(verifyEmailBodySchema, 'Email verification payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(signupSessionUserResponseSchema),
        'Email verified'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid or expired code'
      ),
    },
  }),

  resendVerification: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/resend-verification',
    summary: 'Resend verification code',
    request: {
      body: jsonContentRequired(emailOnlyBodySchema, 'Email address'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Verification code sent if account exists'
      ),
    },
  }),

  forgotPassword: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/forgot-password',
    summary: 'Request password reset',
    request: {
      body: jsonContentRequired(emailOnlyBodySchema, 'Email address'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Reset code sent if account exists'
      ),
    },
  }),

  verifyResetOtp: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/verify-reset-otp',
    summary: 'Verify password reset OTP',
    description: 'Returns a short-lived reset token after OTP verification.',
    request: {
      body: jsonContentRequired(verifyResetOtpBodySchema, 'Password reset OTP'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(resetTokenResponseSchema),
        'Reset token issued'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid or expired code'
      ),
    },
  }),

  resetPassword: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/reset-password',
    summary: 'Reset password',
    request: {
      body: jsonContentRequired(resetPasswordBodySchema, 'New password and reset token'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Password updated'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid or expired reset token'
      ),
    },
  }),

  logout: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/logout',
    summary: 'Log out and clear auth cookie',
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Logged out'
      ),
    },
  }),

  session: createRoute({
    method: 'get',
    tags: ['Auth'],
    path: '/auth/session',
    summary: 'Validate current session',
    description: 'Lightweight check used by clients to detect blocked accounts or revoked sessions.',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(sessionResponseSchema),
        'Session is valid'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Session expired'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Account blocked'
      ),
    },
  }),

  getMfaStatus: createRoute({
    method: 'get',
    tags: ['Auth'],
    path: '/auth/mfa',
    summary: 'Get MFA status',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(mfaStatusSchema),
        'MFA status'
      ),
    },
  }),

  setupMfa: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/mfa/setup',
    summary: 'Start authenticator MFA setup',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(mfaSetupSchema),
        'MFA setup secret'
      ),
    },
  }),

  enableMfa: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/mfa/enable',
    summary: 'Enable authenticator MFA',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(enableMfaBodySchema, 'TOTP code'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(mfaStatusSchema),
        'MFA enabled'
      ),
    },
  }),

  disableMfa: createRoute({
    method: 'post',
    tags: ['Auth'],
    path: '/auth/mfa/disable',
    summary: 'Disable authenticator MFA',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(disableMfaBodySchema, 'TOTP code and password'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(mfaStatusSchema),
        'MFA disabled'
      ),
    },
  }),
}
