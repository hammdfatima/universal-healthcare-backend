import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import { ALLERGIES_ROUTE_HANDLER } from '~/routes/allergies/allergies.handler'
import { ALLERGIES_ROUTES } from '~/routes/allergies/allergies.routes'

const router = createRouter()

router.use('/allergies', requireAuth)
router.use('/allergies/*', requireAuth)

router
  .openapi(ALLERGIES_ROUTES.listAllergies, ALLERGIES_ROUTE_HANDLER.listAllergies)
  .openapi(ALLERGIES_ROUTES.createAllergy, ALLERGIES_ROUTE_HANDLER.createAllergy)
  .openapi(ALLERGIES_ROUTES.updateAllergy, ALLERGIES_ROUTE_HANDLER.updateAllergy)
  .openapi(ALLERGIES_ROUTES.deleteAllergy, ALLERGIES_ROUTE_HANDLER.deleteAllergy)

export default router
