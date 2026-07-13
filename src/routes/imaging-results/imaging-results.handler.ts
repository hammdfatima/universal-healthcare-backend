import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { IMAGING_RESULTS_ROUTES } from '~/routes/imaging-results/imaging-results.routes'
import {
  createImagingResult,
  deleteImagingResult,
  listImagingResults,
  updateImagingResult,
} from '~/routes/imaging-results/imaging-results.service'
import type { HandlerMapFromRoutes } from '~/types'

export const IMAGING_RESULTS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof IMAGING_RESULTS_ROUTES
> = {
  listImagingResults: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const patientUserId = c.req.query('patientUserId')
    const data = await listImagingResults(authUser.user_id, patientUserId)

    return c.json(
      {
        success: true,
        message: 'Imaging results fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createImagingResult: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const imagingResult = await createImagingResult(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Imaging result created successfully.',
        data: imagingResult,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateImagingResult: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const imagingResult = await updateImagingResult(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Imaging result updated successfully.',
        data: imagingResult,
      },
      HttpStatusCodes.OK
    )
  },

  deleteImagingResult: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteImagingResult(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Imaging result deleted successfully.',
        data: { message: 'Imaging result deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
