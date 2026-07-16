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
    memberLimit: z.number().int(),
    allowsPets: z.boolean(),
  })
  .openapi('SubscriptionPlanSummary')

export const userSubscriptionSchema = z
  .object({
    id: z.string(),
    status: subscriptionStatusSchema,
    currentPeriodEnd: z.string().nullable(),
    cancelAtPeriodEnd: z.boolean(),
    plan: subscriptionPlanSummarySchema,
    scheduledPlan: subscriptionPlanSummarySchema.nullable().optional(),
    scheduledPlanChangeAt: z.string().nullable().optional(),
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

export const changeTypeSchema = z.enum([
  'upgrade',
  'downgrade',
  'reactivate',
  'new',
])

export const changePlanPreviewSchema = z
  .object({
    mode: z.enum(['updated', 'scheduled', 'checkout']),
    changeType: changeTypeSchema,
    currentPlan: subscriptionPlanSummarySchema.nullable(),
    targetPlan: subscriptionPlanSummarySchema,
    amountDueCents: z.number().int(),
    amountDueFormatted: z.string(),
    creditCents: z.number().int(),
    creditFormatted: z.string().nullable(),
    effectiveAt: z.string().nullable(),
    summary: z.string(),
  })
  .openapi('ChangePlanPreview')

export const changePlanResponseSchema = z
  .discriminatedUnion('mode', [
    z.object({
      mode: z.literal('updated'),
      changeType: changeTypeSchema,
      amountDueCents: z.number().int(),
      amountDueFormatted: z.string(),
      effectiveAt: z.string().nullable(),
      subscription: userSubscriptionSchema,
      isActive: z.boolean(),
      summary: z.string(),
    }),
    z.object({
      mode: z.literal('scheduled'),
      changeType: changeTypeSchema,
      amountDueCents: z.number().int(),
      amountDueFormatted: z.string(),
      effectiveAt: z.string().nullable(),
      subscription: userSubscriptionSchema,
      isActive: z.boolean(),
      summary: z.string(),
    }),
    z.object({
      mode: z.literal('checkout'),
      changeType: changeTypeSchema,
      amountDueCents: z.number().int(),
      amountDueFormatted: z.string(),
      effectiveAt: z.string().nullable(),
      checkoutUrl: z.string().url(),
      sessionId: z.string(),
      summary: z.string(),
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
