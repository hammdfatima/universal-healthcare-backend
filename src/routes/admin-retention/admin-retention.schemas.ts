import { z } from '@hono/zod-openapi'

export const runRetentionJobBodySchema = z
  .object({
    live: z
      .boolean()
      .optional()
      .openapi({ description: 'If true, actually purge eligible records. Defaults to dry-run.' }),
  })
  .openapi('RunRetentionJobBody')

export const retentionJobResultSchema = z
  .object({
    live: z.boolean(),
    evaluated: z.object({
      auditLogs: z.number().int(),
      otps: z.number().int(),
      authSessions: z.number().int(),
    }),
    deleted: z.object({
      auditLogs: z.number().int(),
      otps: z.number().int(),
      authSessions: z.number().int(),
    }),
  })
  .openapi('RetentionJobResult')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('AdminRetentionMessageResponse')
