import { randomBytes } from 'node:crypto'
import { USER_ROLES } from '~/config/roles'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { hashPassword, verifyPassword } from '~/lib/password'
import { decryptPhiNullable } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { exportPatientData } from '~/routes/patient-settings/patient-settings.service'

const EMERGENCY_ACCESS_TTL_MS = 72 * 60 * 60 * 1000
const MAX_FAILED_PIN_ATTEMPTS = 5
const PIN_LOCKOUT_MS = 15 * 60 * 1000

function generateAccessToken() {
  return randomBytes(32).toString('hex')
}

function assertValidPin(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new HttpError('PIN must be 4 to 8 digits.', 400)
  }
}

function formatAccessRecord(
  record: {
    token: string
    isActive: boolean
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    lastAccessedAt: Date | null
  },
  accessUrl: string
) {
  return {
    token: record.token,
    accessUrl,
    isActive: record.isActive,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastAccessedAt: record.lastAccessedAt?.toISOString() ?? null,
  }
}

function getPatientDisplayName(user: {
  firstName: string | null
  lastName: string | null
  name: string | null
}) {
  const firstName = decryptPhiNullable(user.firstName)
  const lastName = decryptPhiNullable(user.lastName)
  const name = decryptPhiNullable(user.name)

  return (
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    name?.trim() ||
    'Patient'
  )
}

function getPatientInitials(user: {
  firstName: string | null
  lastName: string | null
  name: string | null
}) {
  const firstName = decryptPhiNullable(user.firstName)
  const lastName = decryptPhiNullable(user.lastName)
  const name = decryptPhiNullable(user.name)

  if (firstName || lastName) {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'P'
  }

  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || 'P'
  }

  return 'P'
}

export async function getEmergencyAccessStatus(userId: string, appUrl: string) {
  const record = await prisma.emergencyAccessToken.findUnique({
    where: { userId },
  })

  if (!record || !record.isActive) {
    return {
      hasToken: false,
      access: null,
    }
  }

  if (record.expiresAt <= new Date()) {
    return {
      hasToken: false,
      access: null,
    }
  }

  const accessUrl = `${appUrl.replace(/\/$/, '')}/emergency/${record.token}`

  return {
    hasToken: true,
    access: formatAccessRecord(record, accessUrl),
  }
}

export async function generateEmergencyAccess(
  userId: string,
  appUrl: string,
  pin: string
) {
  assertValidPin(pin)

  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  const token = generateAccessToken()
  const accessUrl = `${appUrl.replace(/\/$/, '')}/emergency/${token}`
  const pinHash = await hashPassword(pin)
  const expiresAt = new Date(Date.now() + EMERGENCY_ACCESS_TTL_MS)

  const record = await prisma.emergencyAccessToken.upsert({
    where: { userId },
    create: {
      userId,
      token,
      pinHash,
      expiresAt,
      isActive: true,
      failedPinAttempts: 0,
      lockedUntil: null,
    },
    update: {
      token,
      pinHash,
      expiresAt,
      isActive: true,
      lastAccessedAt: null,
      failedPinAttempts: 0,
      lockedUntil: null,
    },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_CREATE,
    actorUserId: userId,
    actorRole: USER_ROLES.USER,
    patientUserId: userId,
    resourceType: 'EmergencyAccessToken',
    resourceId: record.id,
  })

  return formatAccessRecord(record, accessUrl)
}

export async function revokeEmergencyAccess(userId: string) {
  const record = await prisma.emergencyAccessToken.findUnique({
    where: { userId },
  })

  if (!record) {
    throw new HttpError('No emergency access QR code found.', 404)
  }

  await prisma.emergencyAccessToken.update({
    where: { userId },
    data: { isActive: false },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    actorRole: USER_ROLES.USER,
    patientUserId: userId,
    resourceType: 'EmergencyAccessToken',
    resourceId: record.id,
    metadata: { revoked: true },
  })
}

export async function getPublicEmergencyChallenge(token: string) {
  const accessRecord = await prisma.emergencyAccessToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
          name: true,
        },
      },
    },
  })

  if (
    !accessRecord ||
    !accessRecord.isActive ||
    accessRecord.expiresAt <= new Date() ||
    accessRecord.user.role !== USER_ROLES.USER
  ) {
    throw new HttpError('Emergency access link is invalid, expired, or has been revoked.', 404)
  }

  return {
    needsPin: true as const,
    patientInitials: getPatientInitials(accessRecord.user),
    expiresAt: accessRecord.expiresAt.toISOString(),
  }
}

export async function unlockPublicEmergencyRecords(
  token: string,
  pin: string,
  context?: { ip?: string | null; userAgent?: string | null }
) {
  assertValidPin(pin)

  const accessRecord = await prisma.emergencyAccessToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
          name: true,
        },
      },
    },
  })

  if (
    !accessRecord ||
    !accessRecord.isActive ||
    accessRecord.expiresAt <= new Date() ||
    accessRecord.user.role !== USER_ROLES.USER
  ) {
    throw new HttpError('Emergency access link is invalid, expired, or has been revoked.', 404)
  }

  if (accessRecord.lockedUntil && accessRecord.lockedUntil > new Date()) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.EMERGENCY_UNLOCK_FAILED,
      patientUserId: accessRecord.userId,
      resourceType: 'EmergencyAccessToken',
      resourceId: accessRecord.id,
      ip: context?.ip,
      userAgent: context?.userAgent,
      metadata: { reason: 'locked' },
    })
    throw new HttpError('Too many failed PIN attempts. Try again later.', 429)
  }

  const pinValid = await verifyPassword(pin, accessRecord.pinHash)

  if (!pinValid) {
    const failedPinAttempts = accessRecord.failedPinAttempts + 1
    const lockedUntil =
      failedPinAttempts >= MAX_FAILED_PIN_ATTEMPTS
        ? new Date(Date.now() + PIN_LOCKOUT_MS)
        : null

    await prisma.emergencyAccessToken.update({
      where: { id: accessRecord.id },
      data: {
        failedPinAttempts,
        lockedUntil,
      },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.EMERGENCY_UNLOCK_FAILED,
      patientUserId: accessRecord.userId,
      resourceType: 'EmergencyAccessToken',
      resourceId: accessRecord.id,
      ip: context?.ip,
      userAgent: context?.userAgent,
      metadata: { failedPinAttempts },
    })

    throw new HttpError('Invalid PIN.', 401)
  }

  await prisma.emergencyAccessToken.update({
    where: { id: accessRecord.id },
    data: {
      lastAccessedAt: new Date(),
      failedPinAttempts: 0,
      lockedUntil: null,
    },
  })

  const records = await exportPatientData(accessRecord.userId)

  await writeAuditLog({
    action: AUDIT_ACTIONS.EMERGENCY_UNLOCK,
    patientUserId: accessRecord.userId,
    resourceType: 'EmergencyAccessToken',
    resourceId: accessRecord.id,
    ip: context?.ip,
    userAgent: context?.userAgent,
  })

  return {
    ...records,
    patientName: getPatientDisplayName(accessRecord.user),
    accessedAt: new Date().toISOString(),
  }
}
