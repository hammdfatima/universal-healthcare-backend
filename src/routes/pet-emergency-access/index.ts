import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { PET_EMERGENCY_ACCESS_ROUTE_HANDLER } from '~/routes/pet-emergency-access/pet-emergency-access.handler'
import { PET_EMERGENCY_ACCESS_ROUTES } from '~/routes/pet-emergency-access/pet-emergency-access.routes'

const router = createRouter()

router
  .openapi(
    PET_EMERGENCY_ACCESS_ROUTES.getPublicChallenge,
    PET_EMERGENCY_ACCESS_ROUTE_HANDLER.getPublicChallenge
  )
  .openapi(
    PET_EMERGENCY_ACCESS_ROUTES.unlockPublicRecords,
    PET_EMERGENCY_ACCESS_ROUTE_HANDLER.unlockPublicRecords
  )

router.use('/pets/:petId/emergency-access', requirePatient)
router.use('/pets/:petId/emergency-access/*', requirePatient)

router
  .openapi(
    PET_EMERGENCY_ACCESS_ROUTES.getStatus,
    PET_EMERGENCY_ACCESS_ROUTE_HANDLER.getStatus
  )
  .openapi(
    PET_EMERGENCY_ACCESS_ROUTES.generate,
    PET_EMERGENCY_ACCESS_ROUTE_HANDLER.generate
  )
  .openapi(
    PET_EMERGENCY_ACCESS_ROUTES.revoke,
    PET_EMERGENCY_ACCESS_ROUTE_HANDLER.revoke
  )

export default router
