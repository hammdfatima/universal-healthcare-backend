import * as HttpStatusCodes from 'stoker/http-status-codes'
import type { ADMIN_DASHBOARD_ROUTES } from '~/routes/admin-dashboard/admin-dashboard.routes'
import { getAdminDashboardStats } from '~/routes/admin-dashboard/admin-dashboard.service'
import type { HandlerMapFromRoutes } from '~/types'

export const ADMIN_DASHBOARD_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof ADMIN_DASHBOARD_ROUTES
> = {
  getDashboardStats: async c => {
    const data = await getAdminDashboardStats()

    return c.json(
      {
        success: true,
        message: 'Admin dashboard stats fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },
}
