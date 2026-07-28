import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import prisma from '~/lib/prisma'

const DEFAULT_AUDIT_RETENTION_DAYS = 2190 // 6 years

// HIPAA §6.1 retention job (dry-run by default)
export async function runRetentionJob(options?: { live?: boolean }) {
  const live = options?.live === true || Bun.env.RETENTION_JOB_LIVE === 'true'
  const now = new Date()

  const rules = await prisma.retentionRule.findMany()
  const auditRule = rules.find(rule => rule.category === 'audit_logs')
  const otpRule = rules.find(rule => rule.category === 'otp_tokens')
  const sessionRule = rules.find(rule => rule.category === 'auth_sessions')

  const auditCutoff = new Date(
    now.getTime() -
      (auditRule?.retentionDays ?? DEFAULT_AUDIT_RETENTION_DAYS) *
        24 *
        60 *
        60 *
        1000
  )
  const otpCutoff = new Date(
    now.getTime() - (otpRule?.retentionDays ?? 30) * 24 * 60 * 60 * 1000
  )
  const sessionCutoff = new Date(
    now.getTime() - (sessionRule?.retentionDays ?? 90) * 24 * 60 * 60 * 1000
  )

  const [auditCount, otpCount, sessionCount] = await Promise.all([
    prisma.auditLog.count({ where: { createdAt: { lt: auditCutoff } } }),
    prisma.otp.count({
      where: {
        OR: [{ expiresAt: { lt: otpCutoff } }, { consumedAt: { not: null } }],
        createdAt: { lt: otpCutoff },
      },
    }),
    prisma.authSession.count({
      where: {
        OR: [
          { revokedAt: { not: null, lt: sessionCutoff } },
          { createdAt: { lt: sessionCutoff }, revokedAt: { not: null } },
        ],
      },
    }),
  ])

  const summary = {
    live,
    evaluated: {
      auditLogs: auditCount,
      otps: otpCount,
      authSessions: sessionCount,
    },
    deleted: {
      auditLogs: 0,
      otps: 0,
      authSessions: 0,
    },
  }

  if (live) {
    // Audit logs are append-only via trigger; only purge OTPs/sessions in live mode
    // unless RETENTION_ALLOW_AUDIT_PURGE=true (ops override after legal review).
    if (Bun.env.RETENTION_ALLOW_AUDIT_PURGE === 'true' && auditCount > 0) {
      // Temporarily drop delete trigger is intentionally not automated.
      summary.deleted.auditLogs = 0
    }

    const otpDelete = await prisma.otp.deleteMany({
      where: {
        createdAt: { lt: otpCutoff },
        OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }],
      },
    })
    summary.deleted.otps = otpDelete.count

    const sessionDelete = await prisma.authSession.deleteMany({
      where: {
        revokedAt: { not: null, lt: sessionCutoff },
      },
    })
    summary.deleted.authSessions = sessionDelete.count
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.RETENTION_JOB_RUN,
    resourceType: 'RetentionJob',
    metadata: summary,
  })

  return summary
}
