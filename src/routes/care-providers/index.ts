import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { CARE_PROVIDERS_ROUTE_HANDLER } from '~/routes/care-providers/care-providers.handler'
import { CARE_PROVIDERS_ROUTES } from '~/routes/care-providers/care-providers.routes'

const router = createRouter()

router.use('/care-providers', requirePatient)
router.use('/care-providers/*', requirePatient)

router
  .openapi(
    CARE_PROVIDERS_ROUTES.listCareProviders,
    CARE_PROVIDERS_ROUTE_HANDLER.listCareProviders
  )
  .openapi(
    CARE_PROVIDERS_ROUTES.createCareProvider,
    CARE_PROVIDERS_ROUTE_HANDLER.createCareProvider
  )
  .openapi(
    CARE_PROVIDERS_ROUTES.updateCareProvider,
    CARE_PROVIDERS_ROUTE_HANDLER.updateCareProvider
  )
  .openapi(
    CARE_PROVIDERS_ROUTES.deleteCareProvider,
    CARE_PROVIDERS_ROUTE_HANDLER.deleteCareProvider
  )

export default router
