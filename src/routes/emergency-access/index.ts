import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import { EMERGENCY_ACCESS_ROUTE_HANDLER } from '~/routes/emergency-access/emergency-access.handler'
import { EMERGENCY_ACCESS_ROUTES } from '~/routes/emergency-access/emergency-access.routes'

const router = createRouter()

router.openapi(
  EMERGENCY_ACCESS_ROUTES.getPublicRecords,
  EMERGENCY_ACCESS_ROUTE_HANDLER.getPublicRecords
)

router.use('/emergency-access', requireAuth)
router.use('/emergency-access/*', requireAuth)

router
  .openapi(
    EMERGENCY_ACCESS_ROUTES.getStatus,
    EMERGENCY_ACCESS_ROUTE_HANDLER.getStatus
  )
  .openapi(
    EMERGENCY_ACCESS_ROUTES.generate,
    EMERGENCY_ACCESS_ROUTE_HANDLER.generate
  )
  .openapi(
    EMERGENCY_ACCESS_ROUTES.revoke,
    EMERGENCY_ACCESS_ROUTE_HANDLER.revoke
  )

export default router
