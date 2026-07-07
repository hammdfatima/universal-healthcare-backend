import { z } from '@hono/zod-openapi'

export const ALLERGY_TYPE_FOOD = 'Food'

export const allergySchema = z
  .object({
    id: z.string(),
    allergyType: z.string(),
    nature: z.string(),
    symptoms: z.array(z.string()),
    triggers: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Allergy')

export const allergiesListSchema = z
  .object({
    allergies: z.array(allergySchema),
  })
  .openapi('AllergiesList')

const allergyBodyFields = {
  allergyType: z.string().min(1).openapi({ example: 'Food' }),
  nature: z.string().min(1).openapi({ example: 'Moderate' }),
  symptoms: z.array(z.string().min(1)).min(1).openapi({
    example: ['Hives', 'Shortness of breath'],
  }),
  triggers: z.array(z.string().min(1)).default([]).openapi({
    example: ['Shellfish'],
  }),
}

export const createAllergyBodySchema = z
  .object(allergyBodyFields)
  .superRefine((data, ctx) => {
    if (data.allergyType === ALLERGY_TYPE_FOOD && data.triggers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one food trigger.',
        path: ['triggers'],
      })
    }
  })
  .openapi('CreateAllergyBody')

export const updateAllergyBodySchema = createAllergyBodySchema.openapi('UpdateAllergyBody')

export const allergyIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('AllergyMessageResponse')
