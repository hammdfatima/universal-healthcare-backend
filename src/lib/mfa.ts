import * as OTPAuth from 'otpauth'

import { decryptPhiNullable, encryptPhiRequired } from '~/lib/phi-crypto'

const ISSUER = 'Universal Health Charts'

export function generateMfaSecret() {
  const secret = new OTPAuth.Secret({ size: 20 })
  return secret.base32
}

export function buildOtpAuthUrl(email: string, secretBase32: string) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  })

  return totp.toString()
}

export function verifyTotpCode(secretBase32: string, code: string) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  })

  const delta = totp.validate({ token: code.replace(/\s/g, ''), window: 1 })
  return delta !== null
}

export function encryptMfaSecret(secretBase32: string) {
  return encryptPhiRequired(secretBase32)
}

export function decryptMfaSecret(stored: string | null | undefined) {
  return decryptPhiNullable(stored)
}
