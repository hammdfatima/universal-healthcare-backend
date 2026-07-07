import { createMiddleware } from 'hono/factory'

import { USER_ROLES } from '~/config/roles'
import { verifyAccessToken } from '~/lib/auth'
import { HttpError } from '~/lib/error'
import { assertUserNotBlocked } from '~/routes/users/users.service'
import type { AppMiddlewareVariables, IPayload } from '~/types'

function getBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null
  }

  return authorizationHeader.slice(7).trim()
}

export const requireAuth = createMiddleware<AppMiddlewareVariables<{ user: IPayload }>>(
  async (c, next) => {
    const token = getBearerToken(c.req.header('Authorization'))
    const payload = token ? verifyAccessToken(token) : null

    if (!payload) {
      throw new HttpError('Unauthorized', 401)
    }

    if (payload.role === USER_ROLES.USER) {
      await assertUserNotBlocked(payload.user_id, payload.tokenVersion)
    }

    c.set('user', payload)
    await next()
  }
)

export const requireAdmin = createMiddleware<AppMiddlewareVariables<{ user: IPayload }>>(
  async (c, next) => {
    const token = getBearerToken(c.req.header('Authorization'))
    const payload = token ? verifyAccessToken(token) : null

    if (!payload) {
      throw new HttpError('Unauthorized', 401)
    }

    if (payload.role !== USER_ROLES.ADMIN) {
      throw new HttpError('Forbidden', 403)
    }

    c.set('user', payload)
    await next()
  }
)
