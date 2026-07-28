import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import { ACCESS_TOKEN_EXPIRY_SECONDS } from '~/lib/auth'

export const AUTH_COOKIE_NAME = 'uhc_token'

function cookieOptions() {
  // SameSite=None is needed only for direct cross-site browser calls.
  // Prefer Lax by default; the frontend same-origin proxy rewrites None → Lax.
  const sameSiteEnv = Bun.env.AUTH_COOKIE_SAMESITE?.toLowerCase()
  const sameSite =
    sameSiteEnv === 'none' ? ('None' as const) : ('Lax' as const)

  return {
    httpOnly: true,
    secure: sameSite === 'None' ? true : Bun.env.NODE_ENV === 'production',
    sameSite,
    path: '/',
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS,
  }
}

export function setAuthCookie(c: Context, token: string) {
  setCookie(c, AUTH_COOKIE_NAME, token, cookieOptions())
}

export function clearAuthCookie(c: Context) {
  const options = cookieOptions()
  deleteCookie(c, AUTH_COOKIE_NAME, {
    path: options.path,
    secure: options.secure,
    sameSite: options.sameSite,
  })
}

export function getAuthTokenFromRequest(c: Context): string | null {
  const authorization = c.req.header('Authorization')
  if (authorization?.startsWith('Bearer ')) {
    const bearer = authorization.slice(7).trim()
    if (bearer) {
      return bearer
    }
  }

  const cookieToken = getCookie(c, AUTH_COOKIE_NAME)
  return cookieToken?.trim() || null
}
