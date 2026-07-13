import type { Prisma } from '~/generated/prisma'
import prisma from '~/lib/prisma'

const LIST_LIMIT = 300

function toAuditLogResponse(
  log: {
    id: string
    action: string
    resourceType: string
    resourceId: string | null
    actorUserId: string | null
    actorRole: string | null
    ip: string | null
    userAgent: string | null
    metadata: Prisma.JsonValue | null
    createdAt: Date
  },
  emailByUserId: Map<string, string>
) {
  return {
    id: log.id,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    actorUserId: log.actorUserId,
    actorRole: log.actorRole,
    actorEmail: log.actorUserId
      ? (emailByUserId.get(log.actorUserId) ?? null)
      : null,
    ip: log.ip,
    userAgent: log.userAgent,
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  }
}

export async function listAdminAuditLogs() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
  })

  const userIds = [
    ...new Set(
      auditLogs
        .map(log => log.actorUserId)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        })
      : []

  const emailByUserId = new Map(users.map(user => [user.id, user.email]))

  return {
    auditLogs: auditLogs.map(log => toAuditLogResponse(log, emailByUserId)),
  }
}
