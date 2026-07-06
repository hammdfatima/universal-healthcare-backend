import { z } from '@hono/zod-openapi'
import { billingCycleSchema } from '~/routes/subscription-plans/subscription-plans.schemas'

export const subscriptionStatusSchema = z.enum([
  'active',
  'cancelled',
  'inactive',
  'past_due',
  'trialing',
  'incomplete',
])

export const subscriptionPlanSummarySchema = z
  .object({
    id: z.string(),
    planName: z.string(),
    price: z.string(),
    billingCycle: billingCycleSchema,
    features: z.array(z.string()),
  })
  .openapi('SubscriptionPlanSummary')

export const userSubscriptionSchema = z
  .object({
    id: z.string(),
    status: subscriptionStatusSchema,
    currentPeriodEnd: z.string().nullable(),
    cancelAtPeriodEnd: z.boolean(),
    plan: subscriptionPlanSummarySchema,
  })
  .openapi('UserSubscription')

export const subscriptionMeSchema = z
  .object({
    subscription: userSubscriptionSchema.nullable(),
    isActive: z.boolean(),
  })
  .openapi('SubscriptionMe')

export const checkoutBodySchema = z
  .object({
    planId: z.string().min(1).openapi({ example: 'clx123abc' }),
  })
  .openapi('SubscriptionCheckoutBody')

export const changePlanBodySchema = checkoutBodySchema.openapi('ChangePlanBody')

export const changePlanResponseSchema = z
  .discriminatedUnion('mode', [
    z.object({
      mode: z.literal('updated'),
      subscription: userSubscriptionSchema,
      isActive: z.boolean(),
    }),
    z.object({
      mode: z.literal('checkout'),
      checkoutUrl: z.string().url(),
      sessionId: z.string(),
    }),
  ])
  .openapi('ChangePlanResponse')

export const checkoutSessionSchema = z
  .object({
    checkoutUrl: z.string().url(),
    sessionId: z.string(),
  })
  .openapi('SubscriptionCheckoutSession')

export const checkoutVerifyQuerySchema = z.object({
  session_id: z.string().openapi({
    param: { name: 'session_id', in: 'query' },
    example: 'cs_test_123',
  }),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('SubscriptionMessageResponse')
