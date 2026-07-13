import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import { ACCESS_TOKEN_EXPIRY_SECONDS } from '~/lib/auth'

export const AUTH_COOKIE_NAME = 'uhc_token'

function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'None' as const,
    path: '/',
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS,
  }
}

export function setAuthCookie(c: Context, token: string) {
  setCookie(c, AUTH_COOKIE_NAME, token, cookieOptions())
}

export function clearAuthCookie(c: Context) {
  deleteCookie(c, AUTH_COOKIE_NAME, {
    path: '/',
    secure: true,
    sameSite: 'None',
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
