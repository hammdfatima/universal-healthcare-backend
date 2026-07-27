import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { PET_EMERGENCY_ACCESS_ROUTES } from '~/routes/pet-emergency-access/pet-emergency-access.routes'
import {
  generatePetEmergencyAccess,
  getPetEmergencyAccessStatus,
  getPublicPetEmergencyChallenge,
  revokePetEmergencyAccess,
  unlockPublicPetEmergencyRecords,
} from '~/routes/pet-emergency-access/pet-emergency-access.service'
import type { HandlerMapFromRoutes } from '~/types'

function getAppUrl() {
  return Bun.env.FRONTEND_URL ?? 'http://localhost:3000'
}

export const PET_EMERGENCY_ACCESS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof PET_EMERGENCY_ACCESS_ROUTES
> = {
  getStatus: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { petId } = c.req.valid('param')
    const status = await getPetEmergencyAccessStatus(
      authUser.user_id,
      petId,
      getAppUrl()
    )

    return c.json(
      {
        success: true,
        message: 'Pet emergency access status fetched successfully.',
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

    const { petId } = c.req.valid('param')
    const { pin } = c.req.valid('json')
    const access = await generatePetEmergencyAccess(
      authUser.user_id,
      petId,
      getAppUrl(),
      pin
    )

    return c.json(
      {
        success: true,
        message: 'Pet emergency QR access generated successfully.',
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

    const { petId } = c.req.valid('param')
    await revokePetEmergencyAccess(authUser.user_id, petId)

    return c.json(
      {
        success: true,
        message: 'Pet emergency QR access revoked successfully.',
        data: { message: 'Pet emergency QR access revoked successfully.' },
      },
      HttpStatusCodes.OK
    )
  },

  getPublicChallenge: async c => {
    const { token } = c.req.valid('param')
    const challenge = await getPublicPetEmergencyChallenge(token)

    return c.json(
      {
        success: true,
        message: 'Pet emergency access challenge fetched successfully.',
        data: challenge,
      },
      HttpStatusCodes.OK
    )
  },

  unlockPublicRecords: async c => {
    const { token } = c.req.valid('param')
    const { pin } = c.req.valid('json')
    const records = await unlockPublicPetEmergencyRecords(token, pin, {
      ip: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
      userAgent: c.req.header('user-agent') ?? null,
    })

    return c.json(
      {
        success: true,
        message: 'Pet emergency profile unlocked successfully.',
        data: records,
      },
      HttpStatusCodes.OK
    )
  },
}
