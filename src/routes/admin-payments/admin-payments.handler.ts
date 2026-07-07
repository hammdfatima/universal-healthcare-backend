import * as HttpStatusCodes from 'stoker/http-status-codes'
import type { ADMIN_PAYMENTS_ROUTES } from '~/routes/admin-payments/admin-payments.routes'
import {
  getAdminPaymentById,
  listAdminPayments,
} from '~/routes/admin-payments/admin-payments.service'
import type { HandlerMapFromRoutes } from '~/types'

export const ADMIN_PAYMENTS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof ADMIN_PAYMENTS_ROUTES
> = {
  listPayments: async c => {
    const data = await listAdminPayments()

    return c.json(
      {
        success: true,
        message: 'Payments fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  getPaymentById: async c => {
    const { id } = c.req.valid('param')
    const payment = await getAdminPaymentById(id)

    return c.json(
      {
        success: true,
        message: 'Payment fetched successfully.',
        data: payment,
      },
      HttpStatusCodes.OK
    )
  },
}
