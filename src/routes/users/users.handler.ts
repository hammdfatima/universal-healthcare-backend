import * as HttpStatusCodes from 'stoker/http-status-codes'
import type { USER_ROUTES } from '~/routes/users/users.routes'
import { blockUser, listAdminUsers, unblockUser } from '~/routes/users/users.service'
import type { HandlerMapFromRoutes } from '~/types'

export const USER_ROUTE_HANDLER: HandlerMapFromRoutes<typeof USER_ROUTES> = {
  listAdmin: async c => {
    const users = await listAdminUsers()

    return c.json(
      {
        success: true,
        message: 'Users fetched successfully.',
        data: users,
      },
      HttpStatusCodes.OK
    )
  },

  block: async c => {
    const { id } = c.req.valid('param')
    const user = await blockUser(id)

    return c.json(
      {
        success: true,
        message: 'User blocked successfully.',
        data: user,
      },
      HttpStatusCodes.OK
    )
  },

  unblock: async c => {
    const { id } = c.req.valid('param')
    const user = await unblockUser(id)

    return c.json(
      {
        success: true,
        message: 'User unblocked successfully.',
        data: user,
      },
      HttpStatusCodes.OK
    )
  },
}
