import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { ADMIN_RETENTION_ROUTE_HANDLER } from '~/routes/admin-retention/admin-retention.handler'
import { ADMIN_RETENTION_ROUTES } from '~/routes/admin-retention/admin-retention.routes'

const router = createRouter()

router.use('/admin/retention-job', requireAdmin)

router.openapi(
  ADMIN_RETENTION_ROUTES.runRetentionJob,
  ADMIN_RETENTION_ROUTE_HANDLER.runRetentionJob
)

export default router
