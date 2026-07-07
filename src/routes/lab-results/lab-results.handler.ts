import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { LAB_RESULTS_ROUTES } from '~/routes/lab-results/lab-results.routes'
import {
  createLabResult,
  deleteLabResult,
  listLabResults,
  updateLabResult,
} from '~/routes/lab-results/lab-results.service'
import type { HandlerMapFromRoutes } from '~/types'

export const LAB_RESULTS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof LAB_RESULTS_ROUTES
> = {
  listLabResults: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await listLabResults(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Lab results fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createLabResult: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const labResult = await createLabResult(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Lab result created successfully.',
        data: labResult,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateLabResult: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const labResult = await updateLabResult(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Lab result updated successfully.',
        data: labResult,
      },
      HttpStatusCodes.OK
    )
  },

  deleteLabResult: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteLabResult(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Lab result deleted successfully.',
        data: { message: 'Lab result deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
