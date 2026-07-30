import { createMiddleware } from 'hono/factory'

import { USER_ROLES } from '~/config/roles'
import { isMfaEnabled } from '~/config/mfa'
import { assertSessionActive } from '~/lib/account-security'
import { verifyAccessToken } from '~/lib/auth'
import { getAuthTokenFromRequest } from '~/lib/auth-cookie'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'
import { setRequestAuditActor } from '~/lib/request-context'
import { assertUserNotBlocked } from '~/routes/users/users.service'
import type { AppMiddlewareVariables, IPayload } from '~/types'

/**
 * HIPAA §2.5: paths a not-yet-MFA-enrolled user can still reach so they are able to
 * finish MFA enrollment, manage their password/settings, or sign out.
 */
function isMfaSetupExemptPath(path: string) {
  return (
    path.includes('/mfa') ||
    path.includes('/settings') ||
    path.includes('/admin/profile') ||
    path.includes('/admin/change-password') ||
    path.includes('/auth/session') ||
    path.includes('/auth/logout') ||
    path.includes('/auth/step-up')
  )
}

async function assertMfaEnrolled(userId: string, path: string) {
  if (!isMfaEnabled()) {
    return
  }

  if (isMfaSetupExemptPath(path)) {
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  })

  if (user && !user.mfaEnabled) {
    throw new HttpError('MFA setup required', 403)
  }
}

export const requireAuth = createMiddleware<AppMiddlewareVariables<{ user: IPayload }>>(
  async (c, next) => {
    const token = getAuthTokenFromRequest(c)
    const payload = token ? verifyAccessToken(token) : null

    if (!payload) {
      throw new HttpError('Unauthorized', 401)
    }

    if (payload.role === USER_ROLES.USER) {
      await assertUserNotBlocked(payload.user_id, payload.tokenVersion)
    }

    if (payload.role === USER_ROLES.ADMIN) {
      await assertUserNotBlocked(payload.user_id, payload.tokenVersion)
    }

    await assertSessionActive(payload.user_id, payload.sid)
    setRequestAuditActor(payload.user_id, payload.role)
    c.set('user', payload)
    await next()
  }
)

export const requirePatient = createMiddleware<AppMiddlewareVariables<{ user: IPayload }>>(
  async (c, next) => {
    const token = getAuthTokenFromRequest(c)
    const payload = token ? verifyAccessToken(token) : null

    if (!payload) {
      throw new HttpError('Unauthorized', 401)
    }

    if (payload.role !== USER_ROLES.USER) {
      throw new HttpError('Forbidden', 403)
    }

    await assertUserNotBlocked(payload.user_id, payload.tokenVersion)
    await assertSessionActive(payload.user_id, payload.sid)
    await assertMfaEnrolled(payload.user_id, c.req.path)
    setRequestAuditActor(payload.user_id, payload.role)
    c.set('user', payload)
    await next()
  }
)

export const requireAdmin = createMiddleware<AppMiddlewareVariables<{ user: IPayload }>>(
  async (c, next) => {
    const token = getAuthTokenFromRequest(c)
    const payload = token ? verifyAccessToken(token) : null

    if (!payload) {
      throw new HttpError('Unauthorized', 401)
    }

    if (payload.role !== USER_ROLES.ADMIN) {
      throw new HttpError('Forbidden', 403)
    }

    await assertUserNotBlocked(payload.user_id, payload.tokenVersion)
    await assertSessionActive(payload.user_id, payload.sid)
    await assertMfaEnrolled(payload.user_id, c.req.path)
    setRequestAuditActor(payload.user_id, payload.role)
    c.set('user', payload)
    await next()
  }
)
