import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import { HEALTH_HISTORY_ROUTE_HANDLER } from '~/routes/health-history/health-history.handler'
import { HEALTH_HISTORY_ROUTES } from '~/routes/health-history/health-history.routes'

const router = createRouter()

router.use('/health-history', requireAuth)
router.use('/health-history/*', requireAuth)

router
  .openapi(
    HEALTH_HISTORY_ROUTES.listHealthHistoryEntries,
    HEALTH_HISTORY_ROUTE_HANDLER.listHealthHistoryEntries
  )
  .openapi(
    HEALTH_HISTORY_ROUTES.createHealthHistoryEntry,
    HEALTH_HISTORY_ROUTE_HANDLER.createHealthHistoryEntry
  )
  .openapi(
    HEALTH_HISTORY_ROUTES.updateHealthHistoryEntry,
    HEALTH_HISTORY_ROUTE_HANDLER.updateHealthHistoryEntry
  )
  .openapi(
    HEALTH_HISTORY_ROUTES.deleteHealthHistoryEntry,
    HEALTH_HISTORY_ROUTE_HANDLER.deleteHealthHistoryEntry
  )

export default router
