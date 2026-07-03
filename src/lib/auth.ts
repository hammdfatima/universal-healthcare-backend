import { sign, verify } from 'jsonwebtoken'
import type { IPayload } from '~/types'

const JWT_SECRET = Bun.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables')
}

const ONE_DAY_IN_SECONDS = 60 * 60 * 24

/** OTP email copy + DB otp expiry + reset JWT/expiry must stay aligned */
export const PASSWORD_RESET_AND_OTP_EXPIRY_MINUTES = 10

const RESET_JWT_MARKER = 'password_reset' as const

export type PasswordResetJwtPayload = IPayload & {
  jti: string
  token_use: typeof RESET_JWT_MARKER
}

export function signAccessToken(payload: IPayload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  return sign(payload, JWT_SECRET, {
    expiresIn: ONE_DAY_IN_SECONDS,
  })
}

/** Short-lived JWT; single-use enforced server-side via `PasswordResetToken` + jti */
export function signPasswordResetToken(payload: IPayload, jti: string) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  return sign({ ...payload, jti, token_use: RESET_JWT_MARKER }, JWT_SECRET, {
    expiresIn: PASSWORD_RESET_AND_OTP_EXPIRY_MINUTES * 60,
  })
}

export function verifyAccessToken(token: string): IPayload | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  try {
    return verify(token, JWT_SECRET) as IPayload
  } catch {
    return null
  }
}

/** Only validates tokens issued by `signPasswordResetToken` (never session/login JWT). */
export function verifyPasswordResetToken(token: string): PasswordResetJwtPayload | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  try {
    const decoded = verify(token, JWT_SECRET) as Record<string, unknown>
    if (decoded.token_use !== RESET_JWT_MARKER || typeof decoded.jti !== 'string') {
      return null
    }
    return decoded as PasswordResetJwtPayload
  } catch {
    return null
  }
}
