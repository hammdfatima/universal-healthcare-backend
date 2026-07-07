import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import { MEDICATIONS_ROUTE_HANDLER } from '~/routes/medications/medications.handler'
import { MEDICATIONS_ROUTES } from '~/routes/medications/medications.routes'

const router = createRouter()

router.use('/medications', requireAuth)
router.use('/medications/*', requireAuth)

router
  .openapi(
    MEDICATIONS_ROUTES.listMedications,
    MEDICATIONS_ROUTE_HANDLER.listMedications
  )
  .openapi(
    MEDICATIONS_ROUTES.createMedication,
    MEDICATIONS_ROUTE_HANDLER.createMedication
  )
  .openapi(
    MEDICATIONS_ROUTES.updateMedication,
    MEDICATIONS_ROUTE_HANDLER.updateMedication
  )
  .openapi(
    MEDICATIONS_ROUTES.deleteMedication,
    MEDICATIONS_ROUTE_HANDLER.deleteMedication
  )

export default router
