import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { ADMIN_PAYMENTS_ROUTE_HANDLER } from '~/routes/admin-payments/admin-payments.handler'
import { ADMIN_PAYMENTS_ROUTES } from '~/routes/admin-payments/admin-payments.routes'

const router = createRouter()

router.use('/admin/payments', requireAdmin)
router.use('/admin/payments/*', requireAdmin)

router
  .openapi(
    ADMIN_PAYMENTS_ROUTES.listPayments,
    ADMIN_PAYMENTS_ROUTE_HANDLER.listPayments
  )
  .openapi(
    ADMIN_PAYMENTS_ROUTES.getPaymentById,
    ADMIN_PAYMENTS_ROUTE_HANDLER.getPaymentById
  )

export default router
