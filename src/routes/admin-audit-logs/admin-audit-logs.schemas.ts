import { z } from '@hono/zod-openapi'

export const adminAuditLogSchema = z
  .object({
    id: z.string(),
    action: z.string(),
    resourceType: z.string(),
    resourceId: z.string().nullable(),
    actorUserId: z.string().nullable(),
    actorRole: z.string().nullable(),
    actorEmail: z.string().nullable(),
    ip: z.string().nullable(),
    userAgent: z.string().nullable(),
    metadata: z.unknown().nullable(),
    createdAt: z.string(),
  })
  .openapi('AdminAuditLog')

export const adminAuditLogsListSchema = z
  .object({
    auditLogs: z.array(adminAuditLogSchema),
  })
  .openapi('AdminAuditLogsList')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('AdminAuditLogMessageResponse')
