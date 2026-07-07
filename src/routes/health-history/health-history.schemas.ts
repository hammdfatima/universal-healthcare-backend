import { z } from '@hono/zod-openapi'

export const healthHistoryEntrySchema = z
  .object({
    id: z.string(),
    illnessName: z.string(),
    diagnosisDate: z.string(),
    prescribedBy: z.string(),
    details: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('HealthHistoryEntry')

export const healthHistoryListSchema = z
  .object({
    entries: z.array(healthHistoryEntrySchema),
  })
  .openapi('HealthHistoryList')

export const createHealthHistoryBodySchema = z
  .object({
    illnessName: z.string().min(1).openapi({ example: 'Type 2 Diabetes' }),
    diagnosisDate: z.string().min(1).openapi({ example: '03/15/2019' }),
    prescribedBy: z.string().min(1).openapi({ example: 'Dr. Brooklyn Belle' }),
    details: z.string().min(1).openapi({
      example:
        'Diagnosed following elevated HbA1c. Started on Metformin 500 mg twice daily.',
    }),
  })
  .openapi('CreateHealthHistoryBody')

export const updateHealthHistoryBodySchema = createHealthHistoryBodySchema.openapi(
  'UpdateHealthHistoryBody'
)

export const healthHistoryIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('HealthHistoryMessageResponse')
