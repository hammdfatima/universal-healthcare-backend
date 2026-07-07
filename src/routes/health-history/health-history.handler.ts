import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { HEALTH_HISTORY_ROUTES } from '~/routes/health-history/health-history.routes'
import {
  createHealthHistoryEntry,
  deleteHealthHistoryEntry,
  listHealthHistoryEntries,
  updateHealthHistoryEntry,
} from '~/routes/health-history/health-history.service'
import type { HandlerMapFromRoutes } from '~/types'

export const HEALTH_HISTORY_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof HEALTH_HISTORY_ROUTES
> = {
  listHealthHistoryEntries: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await listHealthHistoryEntries(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Health history fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createHealthHistoryEntry: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const entry = await createHealthHistoryEntry(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Health history entry created successfully.',
        data: entry,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateHealthHistoryEntry: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const entry = await updateHealthHistoryEntry(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Health history entry updated successfully.',
        data: entry,
      },
      HttpStatusCodes.OK
    )
  },

  deleteHealthHistoryEntry: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteHealthHistoryEntry(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Health history entry deleted successfully.',
        data: { message: 'Health history entry deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
