import { PASSWORD_RESET_AND_OTP_EXPIRY_MINUTES } from '~/lib/auth'

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function getOtpExpiryDate() {
  return new Date(Date.now() + PASSWORD_RESET_AND_OTP_EXPIRY_MINUTES * 60 * 1000)
}
