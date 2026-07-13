import * as HttpStatusCodes from 'stoker/http-status-codes'
import { clearAuthCookie, setAuthCookie } from '~/lib/auth-cookie'
import { HttpError } from '~/lib/error'
import { decryptPhiNullable } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import type { AUTH_ROUTES } from '~/routes/auth/auth.routes'
import {
  disableMfa,
  enableMfa,
  forgotPassword,
  GENERIC_RESET_MESSAGE,
  getMfaStatus,
  loginUser,
  resendVerification,
  resetPassword,
  setupMfa,
  signupUser,
  verifyEmail,
  verifyMfaLogin,
  verifyResetOtp,
} from '~/routes/auth/auth.service'
import type { HandlerMapFromRoutes } from '~/types'

function getSignInContext(c: {
  req: { header: (name: string) => string | undefined }
}) {
  const forwardedFor = c.req.header('x-forwarded-for')
  const ipAddress =
    forwardedFor?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') ||
    null

  return { ipAddress }
}

export const AUTH_ROUTE_HANDLER: HandlerMapFromRoutes<typeof AUTH_ROUTES> = {
  signup: async c => {
    const body = c.req.valid('json')
    await signupUser(body)

    return c.json(
      {
        success: true,
        message: 'Account created. Please check your email for the verification code.',
        data: {
          message: 'Account created. Please check your email for the verification code.',
        },
      },
      HttpStatusCodes.CREATED
    )
  },

  login: async c => {
    const body = c.req.valid('json')
    const result = await loginUser(body.email, body.password, getSignInContext(c))

    if (result.mfaRequired) {
      return c.json(
        {
          success: true,
          message: 'Authenticator code required.',
          data: {
            mfaRequired: true as const,
            mfaToken: result.mfaToken,
          },
        },
        HttpStatusCodes.OK
      )
    }

    setAuthCookie(c, result.token)

    return c.json(
      {
        success: true,
        message: 'Login successful.',
        data: {
          mfaRequired: false as const,
          user: result.user,
        },
      },
      HttpStatusCodes.OK
    )
  },

  verifyMfaLogin: async c => {
    const body = c.req.valid('json')
    const result = await verifyMfaLogin(body.mfaToken, body.code, getSignInContext(c))
    setAuthCookie(c, result.token)

    return c.json(
      {
        success: true,
        message: 'Login successful.',
        data: {
          mfaRequired: false as const,
          user: result.user,
        },
      },
      HttpStatusCodes.OK
    )
  },

  verifyEmail: async c => {
    const body = c.req.valid('json')
    const result = await verifyEmail(body.email, body.otp, getSignInContext(c))
    setAuthCookie(c, result.token)

    return c.json(
      {
        success: true,
        message: 'Email verified successfully.',
        data: {
          mfaRequired: false as const,
          user: result.user,
        },
      },
      HttpStatusCodes.OK
    )
  },

  resendVerification: async c => {
    const body = c.req.valid('json')
    await resendVerification(body.email)

    return c.json(
      {
        success: true,
        message: GENERIC_RESET_MESSAGE,
        data: { message: GENERIC_RESET_MESSAGE },
      },
      HttpStatusCodes.OK
    )
  },

  forgotPassword: async c => {
    const body = c.req.valid('json')
    await forgotPassword(body.email)

    return c.json(
      {
        success: true,
        message: GENERIC_RESET_MESSAGE,
        data: { message: GENERIC_RESET_MESSAGE },
      },
      HttpStatusCodes.OK
    )
  },

  verifyResetOtp: async c => {
    const body = c.req.valid('json')
    const result = await verifyResetOtp(body.email, body.otp)

    return c.json(
      {
        success: true,
        message: 'Verification successful.',
        data: result,
      },
      HttpStatusCodes.OK
    )
  },

  resetPassword: async c => {
    const body = c.req.valid('json')
    await resetPassword(body.token, body.password)

    return c.json(
      {
        success: true,
        message: 'Password updated successfully.',
        data: { message: 'Password updated successfully.' },
      },
      HttpStatusCodes.OK
    )
  },

  logout: async c => {
    clearAuthCookie(c)

    return c.json(
      {
        success: true,
        message: 'Logged out successfully.',
        data: { message: 'Logged out successfully.' },
      },
      HttpStatusCodes.OK
    )
  },

  session: async c => {
    const authUser = c.get('user')
    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const user = await prisma.user.findUnique({ where: { id: authUser.user_id } })
    if (!user) {
      throw new HttpError('Unauthorized', 401)
    }

    return c.json(
      {
        success: true,
        message: 'Session is valid.',
        data: {
          valid: true as const,
          user: {
            id: user.id,
            email: user.email,
            firstName: decryptPhiNullable(user.firstName),
            lastName: decryptPhiNullable(user.lastName),
            name: decryptPhiNullable(user.name),
            profileImage: user.profileImage,
            role: user.role,
            emailVerified: user.emailVerified,
            mustChangePassword: user.mustChangePassword,
            isFamilyMemberAccount: Boolean(user.managedByOwnerId),
            mfaEnabled: user.mfaEnabled,
          },
        },
      },
      HttpStatusCodes.OK
    )
  },

  getMfaStatus: async c => {
    const authUser = c.get('user')
    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await getMfaStatus(authUser.user_id)
    return c.json(
      {
        success: true,
        message: 'MFA status fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  setupMfa: async c => {
    const authUser = c.get('user')
    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await setupMfa(authUser.user_id)
    return c.json(
      {
        success: true,
        message: 'MFA setup started.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  enableMfa: async c => {
    const authUser = c.get('user')
    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const data = await enableMfa(authUser.user_id, body.code)
    return c.json(
      {
        success: true,
        message: 'Authenticator MFA enabled.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  disableMfa: async c => {
    const authUser = c.get('user')
    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const data = await disableMfa(authUser.user_id, body.code, body.password)
    return c.json(
      {
        success: true,
        message: 'Authenticator MFA disabled.',
        data,
      },
      HttpStatusCodes.OK
    )
  },
}
