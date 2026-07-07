import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { VACCINATIONS_ROUTES } from '~/routes/vaccinations/vaccinations.routes'
import {
  createVaccination,
  deleteVaccination,
  listVaccinations,
  updateVaccination,
} from '~/routes/vaccinations/vaccinations.service'
import type { HandlerMapFromRoutes } from '~/types'

export const VACCINATIONS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof VACCINATIONS_ROUTES
> = {
  listVaccinations: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await listVaccinations(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Vaccinations fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createVaccination: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const vaccination = await createVaccination(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Vaccination created successfully.',
        data: vaccination,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateVaccination: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const vaccination = await updateVaccination(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Vaccination updated successfully.',
        data: vaccination,
      },
      HttpStatusCodes.OK
    )
  },

  deleteVaccination: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteVaccination(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Vaccination deleted successfully.',
        data: { message: 'Vaccination deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
