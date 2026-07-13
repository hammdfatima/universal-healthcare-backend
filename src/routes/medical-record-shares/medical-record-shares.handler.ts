import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { MEDICAL_RECORD_SHARES_ROUTES } from '~/routes/medical-record-shares/medical-record-shares.routes'
import {
  getSharingSettings,
  listAccessiblePatients,
  listSidebarFamily,
  updateSharingSettings,
} from '~/routes/medical-record-shares/medical-record-shares.service'
import type { HandlerMapFromRoutes } from '~/types'

export const MEDICAL_RECORD_SHARES_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof MEDICAL_RECORD_SHARES_ROUTES
> = {
  getSharingSettings: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await getSharingSettings(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Sharing settings fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  updateSharingSettings: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const data = await updateSharingSettings(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Sharing settings updated successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  listSidebarFamily: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await listSidebarFamily(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Sidebar family fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  listAccessiblePatients: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await listAccessiblePatients(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Accessible patients fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },
}
