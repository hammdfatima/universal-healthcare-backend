import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import { IMAGING_RESULTS_ROUTE_HANDLER } from '~/routes/imaging-results/imaging-results.handler'
import { IMAGING_RESULTS_ROUTES } from '~/routes/imaging-results/imaging-results.routes'

const router = createRouter()

router.use('/imaging-results', requireAuth)
router.use('/imaging-results/*', requireAuth)

router
  .openapi(
    IMAGING_RESULTS_ROUTES.listImagingResults,
    IMAGING_RESULTS_ROUTE_HANDLER.listImagingResults
  )
  .openapi(
    IMAGING_RESULTS_ROUTES.createImagingResult,
    IMAGING_RESULTS_ROUTE_HANDLER.createImagingResult
  )
  .openapi(
    IMAGING_RESULTS_ROUTES.updateImagingResult,
    IMAGING_RESULTS_ROUTE_HANDLER.updateImagingResult
  )
  .openapi(
    IMAGING_RESULTS_ROUTES.deleteImagingResult,
    IMAGING_RESULTS_ROUTE_HANDLER.deleteImagingResult
  )

export default router
