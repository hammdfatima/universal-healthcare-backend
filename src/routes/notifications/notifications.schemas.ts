import { z } from '@hono/zod-openapi'

export const notificationTypeSchema = z.enum([
  'medication',
  'vaccination',
  'lab',
  'imaging',
  'provider',
  'system',
])

export const notificationSchema = z
  .object({
    id: z.string(),
    type: notificationTypeSchema,
    title: z.string(),
    message: z.string(),
    href: z.string().nullable(),
    read: z.boolean(),
    createdAt: z.string(),
  })
  .openapi('Notification')

export const notificationsListSchema = z
  .object({
    notifications: z.array(notificationSchema),
    unreadCount: z.number().int().nonnegative(),
  })
  .openapi('NotificationsList')

export const notificationIdParamSchema = z.object({
  id: z.string().openapi({
    param: { name: 'id', in: 'path' },
    example: 'clx123abc',
  }),
})

export const listNotificationsQuerySchema = z.object({
  timezoneOffset: z.coerce
    .number()
    .int()
    .min(-840)
    .max(840)
    .optional()
    .openapi({
      param: { name: 'timezoneOffset', in: 'query' },
      example: -300,
      description:
        'Browser Date.getTimezoneOffset() value in minutes (local + offset = UTC).',
    }),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('NotificationMessageResponse')
