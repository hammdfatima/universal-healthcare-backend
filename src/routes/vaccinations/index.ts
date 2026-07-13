import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { VACCINATIONS_ROUTE_HANDLER } from '~/routes/vaccinations/vaccinations.handler'
import { VACCINATIONS_ROUTES } from '~/routes/vaccinations/vaccinations.routes'

const router = createRouter()

router.use('/vaccinations', requirePatient)
router.use('/vaccinations/*', requirePatient)

router
  .openapi(
    VACCINATIONS_ROUTES.listVaccinations,
    VACCINATIONS_ROUTE_HANDLER.listVaccinations
  )
  .openapi(
    VACCINATIONS_ROUTES.createVaccination,
    VACCINATIONS_ROUTE_HANDLER.createVaccination
  )
  .openapi(
    VACCINATIONS_ROUTES.updateVaccination,
    VACCINATIONS_ROUTE_HANDLER.updateVaccination
  )
  .openapi(
    VACCINATIONS_ROUTES.deleteVaccination,
    VACCINATIONS_ROUTE_HANDLER.deleteVaccination
  )

export default router
