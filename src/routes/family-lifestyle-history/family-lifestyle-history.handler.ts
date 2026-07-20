import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { FAMILY_LIFESTYLE_HISTORY_ROUTES } from '~/routes/family-lifestyle-history/family-lifestyle-history.routes'
import {
  getFamilyLifestyleHistory,
  upsertFamilyLifestyleHistory,
} from '~/routes/family-lifestyle-history/family-lifestyle-history.service'
import type { HandlerMapFromRoutes } from '~/types'

export const FAMILY_LIFESTYLE_HISTORY_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof FAMILY_LIFESTYLE_HISTORY_ROUTES
> = {
  getFamilyLifestyleHistory: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const patientUserId = c.req.query('patientUserId')
    const data = await getFamilyLifestyleHistory(authUser.user_id, patientUserId)

    return c.json(
      {
        success: true,
        message: 'Family and lifestyle history fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  upsertFamilyLifestyleHistory: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const data = await upsertFamilyLifestyleHistory(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Family and lifestyle history saved successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },
}
