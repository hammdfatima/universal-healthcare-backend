import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { ADMIN_DASHBOARD_ROUTE_HANDLER } from '~/routes/admin-dashboard/admin-dashboard.handler'
import { ADMIN_DASHBOARD_ROUTES } from '~/routes/admin-dashboard/admin-dashboard.routes'

const router = createRouter()

router.use('/admin/dashboard', requireAdmin)
router.use('/admin/dashboard/*', requireAdmin)

router.openapi(
  ADMIN_DASHBOARD_ROUTES.getDashboardStats,
  ADMIN_DASHBOARD_ROUTE_HANDLER.getDashboardStats
)

export default router
