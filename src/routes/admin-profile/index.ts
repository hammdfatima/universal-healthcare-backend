import { createRouter } from '~/lib/create-app'
import { requireAdmin } from '~/middleware/require-admin'
import { ADMIN_PROFILE_ROUTE_HANDLER } from '~/routes/admin-profile/admin-profile.handler'
import { ADMIN_PROFILE_ROUTES } from '~/routes/admin-profile/admin-profile.routes'

const router = createRouter()

router.use('/admin/profile', requireAdmin)
router.use('/admin/change-password', requireAdmin)

router
  .openapi(ADMIN_PROFILE_ROUTES.getProfile, ADMIN_PROFILE_ROUTE_HANDLER.getProfile)
  .openapi(ADMIN_PROFILE_ROUTES.updateProfile, ADMIN_PROFILE_ROUTE_HANDLER.updateProfile)
  .openapi(ADMIN_PROFILE_ROUTES.changePassword, ADMIN_PROFILE_ROUTE_HANDLER.changePassword)

export default router
