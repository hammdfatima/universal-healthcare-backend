import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import { PATIENT_PROFILE_ROUTE_HANDLER } from '~/routes/patient-profile/patient-profile.handler'
import { PATIENT_PROFILE_ROUTES } from '~/routes/patient-profile/patient-profile.routes'

const router = createRouter()

router.use('/profile', requireAuth)
router.use('/profile/*', requireAuth)

router
  .openapi(
    PATIENT_PROFILE_ROUTES.getProfile,
    PATIENT_PROFILE_ROUTE_HANDLER.getProfile
  )
  .openapi(
    PATIENT_PROFILE_ROUTES.completeOnboarding,
    PATIENT_PROFILE_ROUTE_HANDLER.completeOnboarding
  )

export default router
