import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { PHARMACIES_ROUTE_HANDLER } from '~/routes/pharmacies/pharmacies.handler'
import { PHARMACIES_ROUTES } from '~/routes/pharmacies/pharmacies.routes'

const router = createRouter()

router.use('/pharmacies', requirePatient)
router.use('/pharmacies/*', requirePatient)

router
  .openapi(PHARMACIES_ROUTES.listPharmacies, PHARMACIES_ROUTE_HANDLER.listPharmacies)
  .openapi(PHARMACIES_ROUTES.createPharmacy, PHARMACIES_ROUTE_HANDLER.createPharmacy)
  .openapi(PHARMACIES_ROUTES.updatePharmacy, PHARMACIES_ROUTE_HANDLER.updatePharmacy)
  .openapi(PHARMACIES_ROUTES.deletePharmacy, PHARMACIES_ROUTE_HANDLER.deletePharmacy)

export default router
