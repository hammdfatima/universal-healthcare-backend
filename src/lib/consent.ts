import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import prisma from '~/lib/prisma'

export const POLICY_VERSIONS = {
  TERMS_OF_USE: '2026-07-01',
  PRIVACY_POLICY: '2026-07-01',
  EMERGENCY_ACCESS: '2026-07-01',
  NOTICE_OF_PRIVACY_PRACTICES: '2026-07-01',
} as const

export type ConsentTypeKey = keyof typeof POLICY_VERSIONS

// HIPAA §6.4 consent tracking
export async function recordConsents(params: {
  userId: string
  types: ConsentTypeKey[]
  ip?: string | null
  userAgent?: string | null
}) {
  for (const type of params.types) {
    const version = POLICY_VERSIONS[type]

    await prisma.consentRecord.create({
      data: {
        userId: params.userId,
        type,
        version,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.CONSENT_RECORDED,
      actorUserId: params.userId,
      patientUserId: params.userId,
      resourceType: 'ConsentRecord',
      metadata: { type, version },
      ip: params.ip,
      userAgent: params.userAgent,
    })
  }
}
