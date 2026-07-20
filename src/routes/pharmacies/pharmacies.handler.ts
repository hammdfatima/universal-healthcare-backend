import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { PHARMACIES_ROUTES } from '~/routes/pharmacies/pharmacies.routes'
import {
  createPharmacy,
  deletePharmacy,
  listPharmacies,
  updatePharmacy,
} from '~/routes/pharmacies/pharmacies.service'
import type { HandlerMapFromRoutes } from '~/types'

export const PHARMACIES_ROUTE_HANDLER: HandlerMapFromRoutes<typeof PHARMACIES_ROUTES> = {
  listPharmacies: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const patientUserId = c.req.query('patientUserId')
    const data = await listPharmacies(authUser.user_id, patientUserId)

    return c.json(
      {
        success: true,
        message: 'Pharmacies fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createPharmacy: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const pharmacy = await createPharmacy(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Pharmacy created successfully.',
        data: pharmacy,
      },
      HttpStatusCodes.CREATED
    )
  },

  updatePharmacy: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const pharmacy = await updatePharmacy(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Pharmacy updated successfully.',
        data: pharmacy,
      },
      HttpStatusCodes.OK
    )
  },

  deletePharmacy: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deletePharmacy(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Pharmacy deleted successfully.',
        data: { message: 'Pharmacy deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
