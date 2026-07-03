import { z } from "zod"

export const STRONG_PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."

export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false
  return true
}

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .refine(isStrongPassword, {
    message: STRONG_PASSWORD_MESSAGE,
  })
