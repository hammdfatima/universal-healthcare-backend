import type { Role } from '~/generated/prisma'
import prisma from '~/lib/prisma'
import { getRequestAuditContext } from '~/lib/request-context'

export const AUDIT_ACTIONS = {
  PHI_READ: 'PHI_READ',
  PHI_CREATE: 'PHI_CREATE',
  PHI_UPDATE: 'PHI_UPDATE',
  PHI_DELETE: 'PHI_DELETE',
  EMERGENCY_UNLOCK: 'EMERGENCY_UNLOCK',
  EMERGENCY_UNLOCK_FAILED: 'EMERGENCY_UNLOCK_FAILED',
  ADMIN_USER_BLOCK: 'ADMIN_USER_BLOCK',
  ADMIN_USER_UNBLOCK: 'ADMIN_USER_UNBLOCK',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

type WriteAuditLogInput = {
  action: AuditAction | string
  actorUserId?: string | null
  actorRole?: Role | string | null
  resourceType: string
  resourceId?: string | null
  patientUserId?: string | null
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  const requestContext = getRequestAuditContext()

  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId ?? requestContext.actorUserId ?? null,
        actorRole: input.actorRole
          ? String(input.actorRole)
          : (requestContext.actorRole ?? null),
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        patientUserId: input.patientUserId ?? null,
        ip: input.ip ?? requestContext.ip ?? null,
        userAgent: input.userAgent ?? requestContext.userAgent ?? null,
        metadata: input.metadata ?? undefined,
      },
    })
  } catch (error) {
    console.error('[audit] Failed to write audit log:', error)
  }
}
