import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { FAMILY_MEMBERS_ROUTE_HANDLER } from '~/routes/family-members/family-members.handler'
import { FAMILY_MEMBERS_ROUTES } from '~/routes/family-members/family-members.routes'

const router = createRouter()

router.use('/family-members', requirePatient)
router.use('/family-members/*', requirePatient)

router
  .openapi(
    FAMILY_MEMBERS_ROUTES.listFamilyMembers,
    FAMILY_MEMBERS_ROUTE_HANDLER.listFamilyMembers
  )
  .openapi(
    FAMILY_MEMBERS_ROUTES.createFamilyMember,
    FAMILY_MEMBERS_ROUTE_HANDLER.createFamilyMember
  )
  .openapi(
    FAMILY_MEMBERS_ROUTES.updateFamilyMember,
    FAMILY_MEMBERS_ROUTE_HANDLER.updateFamilyMember
  )
  .openapi(
    FAMILY_MEMBERS_ROUTES.deleteFamilyMember,
    FAMILY_MEMBERS_ROUTE_HANDLER.deleteFamilyMember
  )

export default router
