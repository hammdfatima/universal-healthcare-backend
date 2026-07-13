import { createHash, randomInt } from 'node:crypto'
import { PASSWORD_RESET_AND_OTP_EXPIRY_MINUTES } from '~/lib/auth'

export function generateOtpCode() {
  return String(randomInt(100000, 1000000))
}

export function hashOtpCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export function getOtpExpiryDate() {
  return new Date(Date.now() + PASSWORD_RESET_AND_OTP_EXPIRY_MINUTES * 60 * 1000)
}
