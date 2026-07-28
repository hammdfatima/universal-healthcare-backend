import * as HttpStatusCodes from 'stoker/http-status-codes'
import { runRetentionJob } from '~/lib/retention'
import type { ADMIN_RETENTION_ROUTES } from '~/routes/admin-retention/admin-retention.routes'
import type { HandlerMapFromRoutes } from '~/types'

export const ADMIN_RETENTION_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof ADMIN_RETENTION_ROUTES
> = {
  runRetentionJob: async c => {
    const body = c.req.valid('json')
    const data = await runRetentionJob({ live: body.live })

    return c.json(
      {
        success: true,
        message: data.live
          ? 'Retention job completed.'
          : 'Retention job dry-run completed.',
        data,
      },
      HttpStatusCodes.OK
    )
  },
}
