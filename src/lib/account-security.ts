import { randomBytes } from 'node:crypto'

import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'
import { normalizeClientIp } from '~/lib/request-context'

const LOCKOUT_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

// HIPAA §1.3 durable account lockout
export async function assertAccountNotLocked(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, lockedUntil: true },
  })

  if (!user?.lockedUntil) {
    return
  }

  if (user.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 1000
    )
    throw new HttpError(
      `Account locked due to failed login attempts. Try again in ${retryAfterSeconds} seconds.`,
      429
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })
}

export async function recordDurableLoginFailure(params: {
  userId?: string | null
  email?: string | null
  ip?: string | null
}) {
  if (!params.userId) {
    return { locked: false as const }
  }

  const user = await prisma.user.update({
    where: { id: params.userId },
    data: {
      failedLoginAttempts: { increment: 1 },
    },
    select: {
      id: true,
      failedLoginAttempts: true,
      role: true,
    },
  })

  if (user.failedLoginAttempts < LOCKOUT_ATTEMPTS) {
    return { locked: false as const }
  }

  const lockedUntil = new Date(Date.now() + LOCKOUT_MS)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lockedUntil,
      failedLoginAttempts: user.failedLoginAttempts,
    },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.LOGIN_LOCKED,
    actorUserId: user.id,
    actorRole: user.role,
    resourceType: 'Auth',
    resourceId: user.id,
    ip: params.ip,
    metadata: {
      emailHash: params.email
        ? Buffer.from(params.email.toLowerCase()).toString('base64url').slice(0, 12)
        : null,
      attempts: user.failedLoginAttempts,
    },
  })

  return { locked: true as const, lockedUntil }
}

export async function clearDurableLoginFailures(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })
}

export function createSessionId() {
  return randomBytes(24).toString('hex')
}

export async function createAuthSession(params: {
  userId: string
  sessionId: string
  ip?: string | null
  userAgent?: string | null
}) {
  await prisma.authSession.create({
    data: {
      userId: params.userId,
      sessionId: params.sessionId,
      ip: normalizeClientIp(params.ip) ?? null,
      userAgent: params.userAgent ?? null,
    },
  })
}

export async function touchAuthSession(sessionId: string) {
  await prisma.authSession.updateMany({
    where: { sessionId, revokedAt: null },
    data: { lastSeenAt: new Date() },
  })
}

export async function assertSessionActive(userId: string, sessionId?: string | null) {
  if (!sessionId) {
    return
  }

  const session = await prisma.authSession.findUnique({
    where: { sessionId },
    select: { userId: true, revokedAt: true },
  })

  if (!session || session.userId !== userId || session.revokedAt) {
    throw new HttpError('Unauthorized', 401)
  }
}

export async function listAuthSessions(userId: string) {
  return prisma.authSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: 'desc' },
    select: {
      id: true,
      sessionId: true,
      ip: true,
      userAgent: true,
      lastSeenAt: true,
      createdAt: true,
    },
  })
}

export async function revokeAuthSession(userId: string, sessionId: string) {
  const result = await prisma.authSession.updateMany({
    where: { userId, sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  if (result.count === 0) {
    throw new HttpError('Session not found.', 404)
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.SESSION_REVOKED,
    actorUserId: userId,
    resourceType: 'AuthSession',
    resourceId: sessionId,
  })
}

export async function revokeAllOtherSessions(userId: string, currentSessionId?: string | null) {
  await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(currentSessionId ? { sessionId: { not: currentSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.SESSIONS_REVOKED_ALL,
    actorUserId: userId,
    resourceType: 'Auth',
    resourceId: userId,
  })
}

export async function bumpTokenVersion(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  })
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}
