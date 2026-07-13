import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { MEDICAL_RECORD_SHARES_ROUTE_HANDLER } from '~/routes/medical-record-shares/medical-record-shares.handler'
import { MEDICAL_RECORD_SHARES_ROUTES } from '~/routes/medical-record-shares/medical-record-shares.routes'

const router = createRouter()

router.use('/medical-record-shares', requirePatient)
router.use('/medical-record-shares/*', requirePatient)

router
  .openapi(
    MEDICAL_RECORD_SHARES_ROUTES.getSharingSettings,
    MEDICAL_RECORD_SHARES_ROUTE_HANDLER.getSharingSettings
  )
  .openapi(
    MEDICAL_RECORD_SHARES_ROUTES.updateSharingSettings,
    MEDICAL_RECORD_SHARES_ROUTE_HANDLER.updateSharingSettings
  )
  .openapi(
    MEDICAL_RECORD_SHARES_ROUTES.listSidebarFamily,
    MEDICAL_RECORD_SHARES_ROUTE_HANDLER.listSidebarFamily
  )
  .openapi(
    MEDICAL_RECORD_SHARES_ROUTES.listAccessiblePatients,
    MEDICAL_RECORD_SHARES_ROUTE_HANDLER.listAccessiblePatients
  )

export default router
