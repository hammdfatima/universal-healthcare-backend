import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { PATIENT_DASHBOARD_ROUTES } from '~/routes/patient-dashboard/patient-dashboard.routes'
import { getDashboardStats } from '~/routes/patient-dashboard/patient-dashboard.service'
import type { HandlerMapFromRoutes } from '~/types'

export const PATIENT_DASHBOARD_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof PATIENT_DASHBOARD_ROUTES
> = {
  getDashboardStats: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await getDashboardStats(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Dashboard stats fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },
}
