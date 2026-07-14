import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '~/lib/notifications'
import type { NOTIFICATIONS_ROUTES } from '~/routes/notifications/notifications.routes'
import type { HandlerMapFromRoutes } from '~/types'

export const NOTIFICATIONS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof NOTIFICATIONS_ROUTES
> = {
  listNotifications: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const query = c.req.valid('query')
    const data = await listNotifications(
      authUser.user_id,
      query.timezoneOffset ?? 0
    )

    return c.json(
      {
        success: true,
        message: 'Notifications fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  markNotificationRead: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const notification = await markNotificationRead(authUser.user_id, id)

    if (!notification) {
      throw new HttpError('Notification not found.', 404)
    }

    return c.json(
      {
        success: true,
        message: 'Notification marked as read.',
        data: notification,
      },
      HttpStatusCodes.OK
    )
  },

  markAllNotificationsRead: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await markAllNotificationsRead(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'All notifications marked as read.',
        data,
      },
      HttpStatusCodes.OK
    )
  },
}
