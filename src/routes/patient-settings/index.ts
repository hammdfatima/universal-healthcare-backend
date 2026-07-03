import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import { PATIENT_SETTINGS_ROUTE_HANDLER } from '~/routes/patient-settings/patient-settings.handler'
import { PATIENT_SETTINGS_ROUTES } from '~/routes/patient-settings/patient-settings.routes'

const router = createRouter()

router.use('/settings', requireAuth)
router.use('/settings/*', requireAuth)

router
  .openapi(
    PATIENT_SETTINGS_ROUTES.getSettings,
    PATIENT_SETTINGS_ROUTE_HANDLER.getSettings
  )
  .openapi(
    PATIENT_SETTINGS_ROUTES.updateProfile,
    PATIENT_SETTINGS_ROUTE_HANDLER.updateProfile
  )
  .openapi(
    PATIENT_SETTINGS_ROUTES.updateAccount,
    PATIENT_SETTINGS_ROUTE_HANDLER.updateAccount
  )
  .openapi(
    PATIENT_SETTINGS_ROUTES.changePassword,
    PATIENT_SETTINGS_ROUTE_HANDLER.changePassword
  )

export default router
