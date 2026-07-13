import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { EMERGENCY_ACCESS_ROUTE_HANDLER } from '~/routes/emergency-access/emergency-access.handler'
import { EMERGENCY_ACCESS_ROUTES } from '~/routes/emergency-access/emergency-access.routes'

const router = createRouter()

router
  .openapi(
    EMERGENCY_ACCESS_ROUTES.getPublicChallenge,
    EMERGENCY_ACCESS_ROUTE_HANDLER.getPublicChallenge
  )
  .openapi(
    EMERGENCY_ACCESS_ROUTES.unlockPublicRecords,
    EMERGENCY_ACCESS_ROUTE_HANDLER.unlockPublicRecords
  )

router.use('/emergency-access', requirePatient)
router.use('/emergency-access/*', requirePatient)

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
