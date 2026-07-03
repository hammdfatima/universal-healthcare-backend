import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { USER_ROUTE_HANDLER } from '~/routes/users/users.handler'
import { USER_ROUTES } from '~/routes/users/users.routes'

const router = createRouter()

router.use('/admin/users', requireAdmin)
router.use('/admin/users/*', requireAdmin)

router
  .openapi(USER_ROUTES.listAdmin, USER_ROUTE_HANDLER.listAdmin)
  .openapi(USER_ROUTES.block, USER_ROUTE_HANDLER.block)
  .openapi(USER_ROUTES.unblock, USER_ROUTE_HANDLER.unblock)

export default router
