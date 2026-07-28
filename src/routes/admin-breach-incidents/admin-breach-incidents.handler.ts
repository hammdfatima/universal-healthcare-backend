import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { ADMIN_BREACH_INCIDENTS_ROUTES } from '~/routes/admin-breach-incidents/admin-breach-incidents.routes'
import {
  createBreachIncident,
  deleteBreachIncident,
  listBreachIncidents,
  updateBreachIncident,
} from '~/routes/admin-breach-incidents/admin-breach-incidents.service'
import type { HandlerMapFromRoutes } from '~/types'

export const ADMIN_BREACH_INCIDENTS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof ADMIN_BREACH_INCIDENTS_ROUTES
> = {
  listBreachIncidents: async c => {
    const data = await listBreachIncidents()

    return c.json(
      {
        success: true,
        message: 'Breach incidents fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createBreachIncident: async c => {
    const authUser = c.get('user')
    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const data = await createBreachIncident(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Breach incident logged successfully.',
        data,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateBreachIncident: async c => {
    const authUser = c.get('user')
    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const data = await updateBreachIncident(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Breach incident updated successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  deleteBreachIncident: async c => {
    const authUser = c.get('user')
    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteBreachIncident(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Breach incident deleted successfully.',
        data: { message: 'Breach incident deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
