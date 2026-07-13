import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { PETS_ROUTES } from '~/routes/pets/pets.routes'
import {
  createPet,
  deletePet,
  listPets,
  updatePet,
} from '~/routes/pets/pets.service'
import type { HandlerMapFromRoutes } from '~/types'

export const PETS_ROUTE_HANDLER: HandlerMapFromRoutes<typeof PETS_ROUTES> = {
  listPets: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await listPets(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Pets fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createPet: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const pet = await createPet(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Pet created successfully.',
        data: pet,
      },
      HttpStatusCodes.CREATED
    )
  },

  updatePet: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const pet = await updatePet(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Pet updated successfully.',
        data: pet,
      },
      HttpStatusCodes.OK
    )
  },

  deletePet: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deletePet(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Pet deleted successfully.',
        data: { message: 'Pet deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
