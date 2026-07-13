import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { PATIENT_SETTINGS_ROUTE_HANDLER } from '~/routes/patient-settings/patient-settings.handler'
import { PATIENT_SETTINGS_ROUTES } from '~/routes/patient-settings/patient-settings.routes'

const router = createRouter()

router.use('/settings', requirePatient)
router.use('/settings/*', requirePatient)

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
  .openapi(
    PATIENT_SETTINGS_ROUTES.exportData,
    PATIENT_SETTINGS_ROUTE_HANDLER.exportData
  )
  .openapi(
    PATIENT_SETTINGS_ROUTES.deleteAccount,
    PATIENT_SETTINGS_ROUTE_HANDLER.deleteAccount
  )

export default router
