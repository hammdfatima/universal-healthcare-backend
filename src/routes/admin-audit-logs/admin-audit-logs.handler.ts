import * as HttpStatusCodes from 'stoker/http-status-codes'
import type { ADMIN_AUDIT_LOGS_ROUTES } from '~/routes/admin-audit-logs/admin-audit-logs.routes'
import { listAdminAuditLogs } from '~/routes/admin-audit-logs/admin-audit-logs.service'
import type { HandlerMapFromRoutes } from '~/types'

export const ADMIN_AUDIT_LOGS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof ADMIN_AUDIT_LOGS_ROUTES
> = {
  listAuditLogs: async c => {
    const data = await listAdminAuditLogs()

    return c.json(
      {
        success: true,
        message: 'Audit logs fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },
}
