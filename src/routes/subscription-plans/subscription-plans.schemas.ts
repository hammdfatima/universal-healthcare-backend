import { z } from '@hono/zod-openapi'

export const billingCycleSchema = z.enum(['monthly', 'yearly'])

export const subscriptionPlanBodySchema = z
  .object({
    planName: z.string().min(1).openapi({ example: 'Individual Plan' }),
    price: z.string().min(1).openapi({ example: '$9.95' }),
    billingCycle: billingCycleSchema.openapi({ example: 'monthly' }),
    features: z
      .array(z.string().min(1))
      .min(1)
      .openapi({ example: ['Unlimited health records', 'Emergency access QR'] }),
    memberLimit: z
      .number()
      .int()
      .min(0)
      .openapi({ example: 6, description: 'Extra household seats beyond the account owner' }),
    allowsPets: z.boolean().openapi({ example: true }),
  })
  .openapi('SubscriptionPlanBody')

export const subscriptionPlanIdParamSchema = z.object({
  id: z.string().openapi({
    param: { name: 'id', in: 'path' },
    example: 'clx123abc',
  }),
})

export const subscriptionPlanSchema = z
  .object({
    id: z.string(),
    planName: z.string(),
    price: z.string(),
    billingCycle: billingCycleSchema,
    features: z.array(z.string()),
    memberLimit: z.number().int(),
    allowsPets: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('SubscriptionPlan')

export const subscriptionPlanListSchema = z.array(subscriptionPlanSchema)

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('SubscriptionPlanMessageResponse')
