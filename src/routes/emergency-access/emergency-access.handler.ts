import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { EMERGENCY_ACCESS_ROUTES } from '~/routes/emergency-access/emergency-access.routes'
import {
  generateEmergencyAccess,
  getEmergencyAccessStatus,
  getPublicEmergencyChallenge,
  revokeEmergencyAccess,
  unlockPublicEmergencyRecords,
} from '~/routes/emergency-access/emergency-access.service'
import type { HandlerMapFromRoutes } from '~/types'

function getAppUrl() {
  const appUrl = Bun.env.FRONTEND_URL ?? 'http://localhost:3000'
  return appUrl
}

export const EMERGENCY_ACCESS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof EMERGENCY_ACCESS_ROUTES
> = {
  getStatus: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const status = await getEmergencyAccessStatus(authUser.user_id, getAppUrl())

    return c.json(
      {
        success: true,
        message: 'Emergency access status fetched successfully.',
        data: status,
      },
      HttpStatusCodes.OK
    )
  },

  generate: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { pin } = c.req.valid('json')
    const access = await generateEmergencyAccess(authUser.user_id, getAppUrl(), pin)

    return c.json(
      {
        success: true,
        message: 'Emergency QR access generated successfully.',
        data: access,
      },
      HttpStatusCodes.OK
    )
  },

  revoke: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    await revokeEmergencyAccess(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Emergency QR access revoked successfully.',
        data: { message: 'Emergency QR access revoked successfully.' },
      },
      HttpStatusCodes.OK
    )
  },

  getPublicChallenge: async c => {
    const { token } = c.req.valid('param')
    const challenge = await getPublicEmergencyChallenge(token)

    return c.json(
      {
        success: true,
        message: 'Emergency access challenge fetched successfully.',
        data: challenge,
      },
      HttpStatusCodes.OK
    )
  },

  unlockPublicRecords: async c => {
    const { token } = c.req.valid('param')
    const { pin } = c.req.valid('json')
    const records = await unlockPublicEmergencyRecords(token, pin, {
      ip: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
      userAgent: c.req.header('user-agent') ?? null,
    })

    return c.json(
      {
        success: true,
        message: 'Emergency medical records unlocked successfully.',
        data: records,
      },
      HttpStatusCodes.OK
    )
  },
}
