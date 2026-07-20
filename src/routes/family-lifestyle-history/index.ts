import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { FAMILY_LIFESTYLE_HISTORY_ROUTE_HANDLER } from '~/routes/family-lifestyle-history/family-lifestyle-history.handler'
import { FAMILY_LIFESTYLE_HISTORY_ROUTES } from '~/routes/family-lifestyle-history/family-lifestyle-history.routes'

const router = createRouter()

router.use('/family-lifestyle-history', requirePatient)
router.use('/family-lifestyle-history/*', requirePatient)

router
  .openapi(
    FAMILY_LIFESTYLE_HISTORY_ROUTES.getFamilyLifestyleHistory,
    FAMILY_LIFESTYLE_HISTORY_ROUTE_HANDLER.getFamilyLifestyleHistory
  )
  .openapi(
    FAMILY_LIFESTYLE_HISTORY_ROUTES.upsertFamilyLifestyleHistory,
    FAMILY_LIFESTYLE_HISTORY_ROUTE_HANDLER.upsertFamilyLifestyleHistory
  )

export default router
