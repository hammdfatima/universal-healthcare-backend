import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { ADMIN_BREACH_INCIDENTS_ROUTE_HANDLER } from '~/routes/admin-breach-incidents/admin-breach-incidents.handler'
import { ADMIN_BREACH_INCIDENTS_ROUTES } from '~/routes/admin-breach-incidents/admin-breach-incidents.routes'

const router = createRouter()

router.use('/admin/breach-incidents', requireAdmin)
router.use('/admin/breach-incidents/*', requireAdmin)

router
  .openapi(
    ADMIN_BREACH_INCIDENTS_ROUTES.listBreachIncidents,
    ADMIN_BREACH_INCIDENTS_ROUTE_HANDLER.listBreachIncidents
  )
  .openapi(
    ADMIN_BREACH_INCIDENTS_ROUTES.createBreachIncident,
    ADMIN_BREACH_INCIDENTS_ROUTE_HANDLER.createBreachIncident
  )
  .openapi(
    ADMIN_BREACH_INCIDENTS_ROUTES.updateBreachIncident,
    ADMIN_BREACH_INCIDENTS_ROUTE_HANDLER.updateBreachIncident
  )
  .openapi(
    ADMIN_BREACH_INCIDENTS_ROUTES.deleteBreachIncident,
    ADMIN_BREACH_INCIDENTS_ROUTE_HANDLER.deleteBreachIncident
  )

export default router
