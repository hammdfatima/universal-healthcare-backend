import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { SUBSCRIPTION_PLAN_ROUTE_HANDLER } from '~/routes/subscription-plans/subscription-plans.handler'
import { SUBSCRIPTION_PLAN_ROUTES } from '~/routes/subscription-plans/subscription-plans.routes'

const router = createRouter()

router.openapi(
  SUBSCRIPTION_PLAN_ROUTES.listPublic,
  SUBSCRIPTION_PLAN_ROUTE_HANDLER.listPublic
)

router.use('/admin/subscription-plans', requireAdmin)
router.use('/admin/subscription-plans/*', requireAdmin)

router
  .openapi(SUBSCRIPTION_PLAN_ROUTES.listAdmin, SUBSCRIPTION_PLAN_ROUTE_HANDLER.listAdmin)
  .openapi(SUBSCRIPTION_PLAN_ROUTES.create, SUBSCRIPTION_PLAN_ROUTE_HANDLER.create)
  .openapi(SUBSCRIPTION_PLAN_ROUTES.update, SUBSCRIPTION_PLAN_ROUTE_HANDLER.update)
  .openapi(SUBSCRIPTION_PLAN_ROUTES.delete, SUBSCRIPTION_PLAN_ROUTE_HANDLER.delete)

export default router
