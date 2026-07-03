import * as HttpStatusCodes from 'stoker/http-status-codes'
import type { AUTH_ROUTES } from '~/routes/auth/auth.routes'
import {
  forgotPassword,
  GENERIC_RESET_MESSAGE,
  loginUser,
  resendVerification,
  resetPassword,
  signupUser,
  verifyEmail,
  verifyResetOtp,
} from '~/routes/auth/auth.service'
import type { HandlerMapFromRoutes } from '~/types'

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
    const result = await loginUser(body.email, body.password)

    return c.json(
      {
        success: true,
        message: 'Login successful.',
        data: result,
      },
      HttpStatusCodes.OK
    )
  },

  verifyEmail: async c => {
    const body = c.req.valid('json')
    const result = await verifyEmail(body.email, body.otp)

    return c.json(
      {
        success: true,
        message: 'Email verified successfully.',
        data: result,
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
}
