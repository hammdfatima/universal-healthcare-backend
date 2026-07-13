import { createMiddleware } from 'hono/factory'

import { USER_ROLES } from '~/config/roles'
import { verifyAccessToken } from '~/lib/auth'
import { getAuthTokenFromRequest } from '~/lib/auth-cookie'
import { HttpError } from '~/lib/error'
import { setRequestAuditActor } from '~/lib/request-context'
import { assertUserNotBlocked } from '~/routes/users/users.service'
import type { AppMiddlewareVariables, IPayload } from '~/types'

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
    setRequestAuditActor(payload.user_id, payload.role)
    c.set('user', payload)
    await next()
  }
)
