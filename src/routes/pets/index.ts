import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { PETS_ROUTE_HANDLER } from '~/routes/pets/pets.handler'
import { PETS_ROUTES } from '~/routes/pets/pets.routes'

const router = createRouter()

router.use('/pets', requirePatient)
router.use('/pets/*', requirePatient)

router
  .openapi(PETS_ROUTES.listPets, PETS_ROUTE_HANDLER.listPets)
  .openapi(PETS_ROUTES.createPet, PETS_ROUTE_HANDLER.createPet)
  .openapi(PETS_ROUTES.listSharedPets, PETS_ROUTE_HANDLER.listSharedPets)
  .openapi(PETS_ROUTES.getPetSharingSettings, PETS_ROUTE_HANDLER.getPetSharingSettings)
  .openapi(PETS_ROUTES.updatePetSharingSettings, PETS_ROUTE_HANDLER.updatePetSharingSettings)
  .openapi(PETS_ROUTES.updatePet, PETS_ROUTE_HANDLER.updatePet)
  .openapi(PETS_ROUTES.deletePet, PETS_ROUTE_HANDLER.deletePet)

export default router
