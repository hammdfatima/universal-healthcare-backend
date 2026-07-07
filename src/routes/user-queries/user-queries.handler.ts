import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { USER_QUERIES_ROUTES } from '~/routes/user-queries/user-queries.routes'
import {
  createUserQuery,
  getAdminUserQueryById,
  listAdminUserQueries,
  replyToUserQuery,
} from '~/routes/user-queries/user-queries.service'
import type { HandlerMapFromRoutes } from '~/types'

export const USER_QUERIES_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof USER_QUERIES_ROUTES
> = {
  createUserQuery: async c => {
    const body = c.req.valid('json')
    const query = await createUserQuery(body)

    return c.json(
      {
        success: true,
        message: 'Your message has been sent successfully.',
        data: query,
      },
      HttpStatusCodes.CREATED
    )
  },

  listAdminUserQueries: async c => {
    const data = await listAdminUserQueries()

    return c.json(
      {
        success: true,
        message: 'User queries fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  getAdminUserQuery: async c => {
    const { id } = c.req.valid('param')
    const query = await getAdminUserQueryById(id)

    return c.json(
      {
        success: true,
        message: 'User query fetched successfully.',
        data: query,
      },
      HttpStatusCodes.OK
    )
  },

  replyToUserQuery: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const query = await replyToUserQuery(authUser.user_id, id, body.reply)

    return c.json(
      {
        success: true,
        message: 'Reply sent and query marked as resolved.',
        data: query,
      },
      HttpStatusCodes.OK
    )
  },
}
