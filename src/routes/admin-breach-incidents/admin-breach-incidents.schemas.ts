import { z } from '@hono/zod-openapi'

export const breachStatusValues = ['open', 'contained', 'closed'] as const

export const breachIncidentSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    status: z.enum(breachStatusValues),
    affectedCountEst: z.number().int(),
    dataCategories: z.array(z.string()),
    detectedAt: z.string(),
    hipaa60dDeadline: z.string(),
    createdByUserId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('BreachIncident')

export const breachIncidentsListSchema = z
  .object({
    incidents: z.array(breachIncidentSchema),
  })
  .openapi('BreachIncidentsList')

export const createBreachIncidentBodySchema = z
  .object({
    title: z.string().min(1).openapi({
      example: 'Unauthorized access to lab results export',
    }),
    summary: z.string().min(1).openapi({
      example: 'Investigating scope of exposure.',
    }),
    status: z.enum(breachStatusValues).optional().openapi({ example: 'open' }),
    affectedCountEst: z.number().int().min(0).optional().openapi({ example: 0 }),
    dataCategories: z.array(z.string()).optional().openapi({ example: [] }),
    detectedAt: z.string().optional().openapi({
      description: 'ISO timestamp; defaults to now.',
    }),
    hipaa60dDeadline: z.string().optional().openapi({
      description:
        'ISO timestamp; defaults to detectedAt + 60 days per the HIPAA Breach Notification Rule.',
    }),
  })
  .openapi('CreateBreachIncidentBody')

export const updateBreachIncidentBodySchema = z
  .object({
    title: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    status: z.enum(breachStatusValues).optional(),
    affectedCountEst: z.number().int().min(0).optional(),
    dataCategories: z.array(z.string()).optional(),
    hipaa60dDeadline: z.string().optional(),
  })
  .openapi('UpdateBreachIncidentBody')

export const breachIncidentIdParamSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'clxbreach123',
  }),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('AdminBreachIncidentMessageResponse')
