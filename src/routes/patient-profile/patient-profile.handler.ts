import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { PATIENT_PROFILE_ROUTES } from '~/routes/patient-profile/patient-profile.routes'
import {
  completePatientOnboarding,
  getPatientProfile,
} from '~/routes/patient-profile/patient-profile.service'
import type { HandlerMapFromRoutes } from '~/types'

export const PATIENT_PROFILE_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof PATIENT_PROFILE_ROUTES
> = {
  getProfile: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const profile = await getPatientProfile(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Profile fetched successfully.',
        data: profile,
      },
      HttpStatusCodes.OK
    )
  },

  completeOnboarding: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const profile = await completePatientOnboarding(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Profile completed successfully.',
        data: profile,
      },
      HttpStatusCodes.OK
    )
  },
}
