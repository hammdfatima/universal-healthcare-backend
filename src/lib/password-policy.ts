import { z } from 'zod'

import { isCommonBreachedPassword } from '~/lib/breached-passwords'

export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 10 characters and include uppercase, lowercase, a number, and a special character.'

export const BREACHED_PASSWORD_MESSAGE =
  'This password is too common or appears in known breach lists. Choose a different password.'

// HIPAA §1.1 password policy
export function isStrongPassword(password: string): boolean {
  if (password.length < 10) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false
  return true
}

export const strongPasswordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .refine(isStrongPassword, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  .refine(value => !isCommonBreachedPassword(value), {
    message: BREACHED_PASSWORD_MESSAGE,
  })
