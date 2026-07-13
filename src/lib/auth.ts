import { sign, verify } from 'jsonwebtoken'
import type { IPayload } from '~/types'

const JWT_SECRET = Bun.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables')
}

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24

/** Access token lifetime — keep in sync with frontend SESSION_MAX_AGE_MS */
export const ACCESS_TOKEN_EXPIRY_SECONDS = ONE_DAY_IN_SECONDS

/** OTP email copy + DB otp expiry + reset JWT/expiry must stay aligned */
export const PASSWORD_RESET_AND_OTP_EXPIRY_MINUTES = 10

const RESET_JWT_MARKER = 'password_reset' as const

export type PasswordResetJwtPayload = IPayload & {
  jti: string
  token_use: typeof RESET_JWT_MARKER
}

const MFA_PENDING_MARKER = 'mfa_pending' as const
export const MFA_PENDING_EXPIRY_SECONDS = 5 * 60

export type MfaPendingJwtPayload = IPayload & {
  token_use: typeof MFA_PENDING_MARKER
}

export function signAccessToken(payload: IPayload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  return sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
  })
}

export function signMfaPendingToken(payload: IPayload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  return sign({ ...payload, token_use: MFA_PENDING_MARKER }, JWT_SECRET, {
    expiresIn: MFA_PENDING_EXPIRY_SECONDS,
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
    const decoded = verify(token, JWT_SECRET) as Record<string, unknown>
    if (decoded.token_use) {
      return null
    }
    return decoded as unknown as IPayload
  } catch {
    return null
  }
}

export function verifyMfaPendingToken(token: string): MfaPendingJwtPayload | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  try {
    const decoded = verify(token, JWT_SECRET) as Record<string, unknown>
    if (decoded.token_use !== MFA_PENDING_MARKER) {
      return null
    }
    return decoded as unknown as MfaPendingJwtPayload
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
