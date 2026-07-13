import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { ALLERGIES_ROUTES } from '~/routes/allergies/allergies.routes'
import {
  createAllergy,
  deleteAllergy,
  listAllergies,
  updateAllergy,
} from '~/routes/allergies/allergies.service'
import type { HandlerMapFromRoutes } from '~/types'

export const ALLERGIES_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof ALLERGIES_ROUTES
> = {
  listAllergies: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const patientUserId = c.req.query('patientUserId')
    const data = await listAllergies(authUser.user_id, patientUserId)

    return c.json(
      {
        success: true,
        message: 'Allergies fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createAllergy: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const allergy = await createAllergy(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Allergy created successfully.',
        data: allergy,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateAllergy: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const allergy = await updateAllergy(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Allergy updated successfully.',
        data: allergy,
      },
      HttpStatusCodes.OK
    )
  },

  deleteAllergy: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteAllergy(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Allergy deleted successfully.',
        data: { message: 'Allergy deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
