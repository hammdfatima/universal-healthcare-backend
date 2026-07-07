import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import { AUTH_ROUTE_HANDLER } from '~/routes/auth/auth.handler'
import { AUTH_ROUTES } from '~/routes/auth/auth.routes'

const router = createRouter()
  .openapi(AUTH_ROUTES.signup, AUTH_ROUTE_HANDLER.signup)
  .openapi(AUTH_ROUTES.login, AUTH_ROUTE_HANDLER.login)
  .openapi(AUTH_ROUTES.verifyEmail, AUTH_ROUTE_HANDLER.verifyEmail)
  .openapi(AUTH_ROUTES.resendVerification, AUTH_ROUTE_HANDLER.resendVerification)
  .openapi(AUTH_ROUTES.forgotPassword, AUTH_ROUTE_HANDLER.forgotPassword)
  .openapi(AUTH_ROUTES.verifyResetOtp, AUTH_ROUTE_HANDLER.verifyResetOtp)
  .openapi(AUTH_ROUTES.resetPassword, AUTH_ROUTE_HANDLER.resetPassword)

router.use('/auth/session', requireAuth)

router.openapi(AUTH_ROUTES.session, AUTH_ROUTE_HANDLER.session)

export default router
