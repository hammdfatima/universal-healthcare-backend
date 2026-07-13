import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { NOTIFICATIONS_ROUTE_HANDLER } from '~/routes/notifications/notifications.handler'
import { NOTIFICATIONS_ROUTES } from '~/routes/notifications/notifications.routes'

const router = createRouter()

router.use('/notifications', requirePatient)
router.use('/notifications/*', requirePatient)

router
  .openapi(
    NOTIFICATIONS_ROUTES.listNotifications,
    NOTIFICATIONS_ROUTE_HANDLER.listNotifications
  )
  .openapi(
    NOTIFICATIONS_ROUTES.markNotificationRead,
    NOTIFICATIONS_ROUTE_HANDLER.markNotificationRead
  )
  .openapi(
    NOTIFICATIONS_ROUTES.markAllNotificationsRead,
    NOTIFICATIONS_ROUTE_HANDLER.markAllNotificationsRead
  )

export default router
