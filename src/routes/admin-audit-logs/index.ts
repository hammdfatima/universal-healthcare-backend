import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { ADMIN_AUDIT_LOGS_ROUTE_HANDLER } from '~/routes/admin-audit-logs/admin-audit-logs.handler'
import { ADMIN_AUDIT_LOGS_ROUTES } from '~/routes/admin-audit-logs/admin-audit-logs.routes'

const router = createRouter()

router.use('/admin/audit-logs', requireAdmin)
router.use('/admin/audit-logs/*', requireAdmin)

router.openapi(
  ADMIN_AUDIT_LOGS_ROUTES.listAuditLogs,
  ADMIN_AUDIT_LOGS_ROUTE_HANDLER.listAuditLogs
)

export default router
