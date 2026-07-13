import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { LAB_RESULTS_ROUTE_HANDLER } from '~/routes/lab-results/lab-results.handler'
import { LAB_RESULTS_ROUTES } from '~/routes/lab-results/lab-results.routes'

const router = createRouter()

router.use('/lab-results', requirePatient)
router.use('/lab-results/*', requirePatient)

router
  .openapi(
    LAB_RESULTS_ROUTES.listLabResults,
    LAB_RESULTS_ROUTE_HANDLER.listLabResults
  )
  .openapi(
    LAB_RESULTS_ROUTES.createLabResult,
    LAB_RESULTS_ROUTE_HANDLER.createLabResult
  )
  .openapi(
    LAB_RESULTS_ROUTES.updateLabResult,
    LAB_RESULTS_ROUTE_HANDLER.updateLabResult
  )
  .openapi(
    LAB_RESULTS_ROUTES.deleteLabResult,
    LAB_RESULTS_ROUTE_HANDLER.deleteLabResult
  )

export default router
