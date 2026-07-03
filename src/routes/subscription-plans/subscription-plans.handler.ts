import * as HttpStatusCodes from 'stoker/http-status-codes'
import type { SUBSCRIPTION_PLAN_ROUTES } from '~/routes/subscription-plans/subscription-plans.routes'
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  listSubscriptionPlans,
  updateSubscriptionPlan,
} from '~/routes/subscription-plans/subscription-plans.service'
import type { HandlerMapFromRoutes } from '~/types'

export const SUBSCRIPTION_PLAN_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof SUBSCRIPTION_PLAN_ROUTES
> = {
  listPublic: async c => {
    const plans = await listSubscriptionPlans()

    return c.json(
      {
        success: true,
        message: 'Subscription plans fetched successfully.',
        data: plans,
      },
      HttpStatusCodes.OK
    )
  },

  listAdmin: async c => {
    const plans = await listSubscriptionPlans()

    return c.json(
      {
        success: true,
        message: 'Subscription plans fetched successfully.',
        data: plans,
      },
      HttpStatusCodes.OK
    )
  },

  create: async c => {
    const body = c.req.valid('json')
    const plan = await createSubscriptionPlan(body)

    return c.json(
      {
        success: true,
        message: 'Subscription plan created successfully.',
        data: plan,
      },
      HttpStatusCodes.CREATED
    )
  },

  update: async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const plan = await updateSubscriptionPlan(id, body)

    return c.json(
      {
        success: true,
        message: 'Subscription plan updated successfully.',
        data: plan,
      },
      HttpStatusCodes.OK
    )
  },

  delete: async c => {
    const { id } = c.req.valid('param')
    await deleteSubscriptionPlan(id)

    return c.json(
      {
        success: true,
        message: 'Subscription plan deleted successfully.',
        data: { message: 'Subscription plan deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
