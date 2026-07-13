import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { PATIENT_DASHBOARD_ROUTE_HANDLER } from '~/routes/patient-dashboard/patient-dashboard.handler'
import { PATIENT_DASHBOARD_ROUTES } from '~/routes/patient-dashboard/patient-dashboard.routes'

const router = createRouter()

router.use('/patient-dashboard', requirePatient)
router.use('/patient-dashboard/*', requirePatient)

router.openapi(
  PATIENT_DASHBOARD_ROUTES.getDashboardStats,
  PATIENT_DASHBOARD_ROUTE_HANDLER.getDashboardStats
)

export default router
