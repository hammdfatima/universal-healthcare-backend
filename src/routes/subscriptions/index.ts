import { createRouter } from '~/lib/create-app'
import { requireAuth } from '~/middleware/require-admin'
import {
  stripeWebhookHandler,
  SUBSCRIPTION_ROUTE_HANDLER,
} from '~/routes/subscriptions/subscriptions.handler'
import { SUBSCRIPTION_ROUTES } from '~/routes/subscriptions/subscriptions.routes'

const router = createRouter()

router.post('/subscriptions/webhook', stripeWebhookHandler)

router.use('/subscriptions/me', requireAuth)
router.use('/subscriptions/checkout', requireAuth)

router
  .openapi(SUBSCRIPTION_ROUTES.getMe, SUBSCRIPTION_ROUTE_HANDLER.getMe)
  .openapi(
    SUBSCRIPTION_ROUTES.createCheckout,
    SUBSCRIPTION_ROUTE_HANDLER.createCheckout
  )
  .openapi(
    SUBSCRIPTION_ROUTES.verifyCheckout,
    SUBSCRIPTION_ROUTE_HANDLER.verifyCheckout
  )

export default router
