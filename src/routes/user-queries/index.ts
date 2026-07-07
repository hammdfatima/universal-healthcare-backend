import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { USER_QUERIES_ROUTE_HANDLER } from '~/routes/user-queries/user-queries.handler'
import { USER_QUERIES_ROUTES } from '~/routes/user-queries/user-queries.routes'

const router = createRouter()

router.openapi(
  USER_QUERIES_ROUTES.createUserQuery,
  USER_QUERIES_ROUTE_HANDLER.createUserQuery
)

router.use('/admin/user-queries', requireAdmin)
router.use('/admin/user-queries/*', requireAdmin)

router
  .openapi(
    USER_QUERIES_ROUTES.listAdminUserQueries,
    USER_QUERIES_ROUTE_HANDLER.listAdminUserQueries
  )
  .openapi(
    USER_QUERIES_ROUTES.getAdminUserQuery,
    USER_QUERIES_ROUTE_HANDLER.getAdminUserQuery
  )
  .openapi(
    USER_QUERIES_ROUTES.replyToUserQuery,
    USER_QUERIES_ROUTE_HANDLER.replyToUserQuery
  )

export default router
