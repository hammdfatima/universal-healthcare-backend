import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { CARE_PROVIDERS_ROUTES } from '~/routes/care-providers/care-providers.routes'
import {
  createCareProvider,
  deleteCareProvider,
  listCareProviders,
  updateCareProvider,
} from '~/routes/care-providers/care-providers.service'
import type { HandlerMapFromRoutes } from '~/types'

export const CARE_PROVIDERS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof CARE_PROVIDERS_ROUTES
> = {
  listCareProviders: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await listCareProviders(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Care providers fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createCareProvider: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const provider = await createCareProvider(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Care provider created successfully.',
        data: provider,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateCareProvider: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const provider = await updateCareProvider(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Care provider updated successfully.',
        data: provider,
      },
      HttpStatusCodes.OK
    )
  },

  deleteCareProvider: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteCareProvider(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Care provider deleted successfully.',
        data: { message: 'Care provider deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
