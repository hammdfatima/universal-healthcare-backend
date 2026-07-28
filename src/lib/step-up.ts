import { createHash } from 'node:crypto'

import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'
import { verifyPassword } from '~/lib/password'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'

const STEP_UP_TTL_MS = 10 * 60 * 1000
const challenges = new Map<string, { expiresAt: number; userId: string }>()

function prune(now: number) {
  for (const [key, value] of challenges) {
    if (value.expiresAt <= now) challenges.delete(key)
  }
}

export function issueStepUpToken(userId: string) {
  prune(Date.now())
  const token = createHash('sha256')
    .update(`${userId}:${Date.now()}:${Math.random()}`)
    .digest('hex')
  challenges.set(token, { userId, expiresAt: Date.now() + STEP_UP_TTL_MS })
  return token
}

export function consumeStepUpToken(userId: string, token: string) {
  prune(Date.now())
  const entry = challenges.get(token)
  if (!entry || entry.userId !== userId || entry.expiresAt <= Date.now()) {
    throw new HttpError('Step-up authentication required.', 403)
  }
  challenges.delete(token)
}

// HIPAA §2.4 step-up authentication
export async function verifyStepUpPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.STEP_UP_FAILURE,
      actorUserId: userId,
      actorRole: user.role,
      resourceType: 'Auth',
      resourceId: userId,
    })
    throw new HttpError('Password verification failed.', 401)
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.STEP_UP_SUCCESS,
    actorUserId: userId,
    actorRole: user.role,
    resourceType: 'Auth',
    resourceId: userId,
  })

  return issueStepUpToken(userId)
}
