import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  messageResponseSchema,
  notificationIdParamSchema,
  listNotificationsQuerySchema,
  notificationSchema,
  notificationsListSchema,
} from '~/routes/notifications/notifications.schemas'

export const NOTIFICATIONS_ROUTES = {
  listNotifications: createRoute({
    method: 'get',
    tags: ['Notifications'],
    path: '/notifications',
    summary: 'List in-app notifications',
    security: [{ bearerAuth: [] }],
    request: {
      query: listNotificationsQuerySchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(notificationsListSchema),
        'Notifications list'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  markNotificationRead: createRoute({
    method: 'patch',
    tags: ['Notifications'],
    path: '/notifications/{id}/read',
    summary: 'Mark a notification as read',
    security: [{ bearerAuth: [] }],
    request: {
      params: notificationIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(notificationSchema),
        'Notification marked as read'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Notification not found'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  markAllNotificationsRead: createRoute({
    method: 'patch',
    tags: ['Notifications'],
    path: '/notifications/read-all',
    summary: 'Mark all notifications as read',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(notificationsListSchema),
        'All notifications marked as read'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),
}
