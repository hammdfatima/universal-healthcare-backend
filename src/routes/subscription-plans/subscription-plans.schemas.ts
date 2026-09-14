import { z } from '@hono/zod-openapi'

export const billingCycleSchema = z.enum(['monthly', 'yearly'])

export const planKindSchema = z.enum(['human', 'pet'])

export const subscriptionPlanBodySchema = z
  .object({
    planName: z.string().min(1).openapi({ example: 'Individual Plan' }),
    price: z.string().min(1).openapi({ example: '$9.95' }),
    billingCycle: billingCycleSchema.openapi({ example: 'monthly' }),
    planKind: planKindSchema.openapi({
      example: 'human',
      description: 'human = UHC membership; pet = pet-only subscription',
    }),
    features: z
      .array(z.string().min(1))
      .min(1)
      .openapi({ example: ['Unlimited health records', 'Emergency access QR'] }),
    memberLimit: z
      .number()
      .int()
      .min(0)
      .openapi({ example: 6, description: 'Extra household seats beyond the account owner' }),
    petLimit: z
      .number()
      .int()
      .min(0)
      .openapi({
        example: 1,
        description: 'Max pets for pet plans (ignored for human plans — pets included free)',
      }),
    allowsPets: z.boolean().openapi({ example: true }),
  })
  .superRefine((value, ctx) => {
    if (value.planKind === 'pet' && value.petLimit < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pet plans require a pet limit of at least 1.',
        path: ['petLimit'],
      })
    }

    if (value.planKind === 'pet' && value.memberLimit > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pet plans cannot include household member seats.',
        path: ['memberLimit'],
      })
    }
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
    planKind: planKindSchema,
    features: z.array(z.string()),
    memberLimit: z.number().int(),
    petLimit: z.number().int(),
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
