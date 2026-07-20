import { z } from '@hono/zod-openapi'

export const substanceKeys = ['caffeine', 'smoking', 'alcohol', 'drug'] as const
export const familyRelationKeys = [
  'grandparents',
  'father',
  'mother',
  'brothers',
  'sisters',
  'sons',
  'daughters',
] as const
export const familyConditionKeys = [
  'cancer',
  'heart_disease',
  'diabetes',
  'stroke_tia',
  'high_blood_pressure',
  'high_cholesterol',
  'liver_disease',
  'alcohol_drug_abuse',
  'anxiety_depression_psychiatric',
  'tuberculosis',
  'anesthesia_complications',
  'genetic_disorder',
] as const

const familyRelationsSchema = z.object({
  grandparents: z.boolean(),
  father: z.boolean(),
  mother: z.boolean(),
  brothers: z.boolean(),
  sisters: z.boolean(),
  sons: z.boolean(),
  daughters: z.boolean(),
})

export const substanceEntrySchema = z
  .object({
    id: z.enum(substanceKeys),
    currentlyUsing: z.boolean(),
    previouslyUsing: z.boolean(),
    typeAmount: z.string(),
    durationYears: z.number().int().min(0).max(100),
    stoppedYear: z.string(),
  })
  .openapi('SubstanceEntry')

export const familyConditionEntrySchema = z
  .object({
    id: z.enum(familyConditionKeys),
    relations: familyRelationsSchema,
    details: z.string(),
  })
  .openapi('FamilyConditionEntry')

export const familyLifestyleHistorySchema = z
  .object({
    substances: z.array(substanceEntrySchema),
    familyHistory: z.array(familyConditionEntrySchema),
    updatedAt: z.string().nullable(),
  })
  .openapi('FamilyLifestyleHistory')

export const familyLifestyleHistoryResponseSchema = z
  .object({
    familyLifestyleHistory: familyLifestyleHistorySchema,
  })
  .openapi('FamilyLifestyleHistoryResponse')

export const upsertFamilyLifestyleHistoryBodySchema = z
  .object({
    substances: z.array(substanceEntrySchema),
    familyHistory: z.array(familyConditionEntrySchema),
  })
  .openapi('UpsertFamilyLifestyleHistoryBody')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('FamilyLifestyleHistoryMessageResponse')
