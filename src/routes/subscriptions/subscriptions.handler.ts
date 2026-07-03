import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { SUBSCRIPTION_ROUTES } from '~/routes/subscriptions/subscriptions.routes'
import {
  createCheckoutSession,
  getUserSubscription,
  handleStripeWebhook,
  verifyCheckoutSession,
} from '~/routes/subscriptions/subscriptions.service'
import type { HandlerMapFromRoutes } from '~/types'

export const SUBSCRIPTION_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof SUBSCRIPTION_ROUTES
> = {
  getMe: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const subscription = await getUserSubscription(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Subscription fetched successfully.',
        data: subscription,
      },
      HttpStatusCodes.OK
    )
  },

  createCheckout: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { planId } = c.req.valid('json')
    const session = await createCheckoutSession(authUser.user_id, planId)

    return c.json(
      {
        success: true,
        message: 'Checkout session created successfully.',
        data: session,
      },
      HttpStatusCodes.OK
    )
  },

  verifyCheckout: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { session_id: sessionId } = c.req.valid('query')
    const result = await verifyCheckoutSession(authUser.user_id, sessionId)

    return c.json(
      {
        success: true,
        message: 'Checkout verified successfully.',
        data: result,
      },
      HttpStatusCodes.OK
    )
  },
}

export async function stripeWebhookHandler(c: {
  req: {
    header: (name: string) => string | undefined
    text: () => Promise<string>
  }
  json: (data: unknown, status?: number) => Response
}) {
  const signature = c.req.header('stripe-signature')

  if (!signature) {
    return c.json({ success: false, message: 'Missing Stripe signature.' }, 400)
  }

  const payload = await c.req.text()
  const result = await handleStripeWebhook(payload, signature)

  return c.json({ success: true, data: result }, 200)
}
