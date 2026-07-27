import { randomBytes } from 'node:crypto'

import { USER_ROLES } from '~/config/roles'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { hashPassword, verifyPassword } from '~/lib/password'
import { decryptPhi } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import {
  assertOwnerOwnsPet,
  getPetEmergencyProfile,
} from '~/routes/pets/pets.service'

const PET_EMERGENCY_ACCESS_TTL_MS = 72 * 60 * 60 * 1000
const MAX_FAILED_PIN_ATTEMPTS = 5
const PIN_LOCKOUT_MS = 15 * 60 * 1000

function generateAccessToken() {
  return randomBytes(32).toString('hex')
}

function assertValidPin(pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    throw new HttpError('PIN must be exactly 4 digits.', 400)
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

function getPetInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export async function getPetEmergencyAccessStatus(
  ownerId: string,
  petId: string,
  appUrl: string
) {
  await assertOwnerOwnsPet(ownerId, petId)

  const record = await prisma.petEmergencyAccessToken.findUnique({
    where: { petId },
  })

  if (!record || !record.isActive || record.expiresAt <= new Date()) {
    return {
      hasToken: false,
      access: null,
    }
  }

  const accessUrl = `${appUrl.replace(/\/$/, '')}/emergency/pet/${record.token}`

  return {
    hasToken: true,
    access: formatAccessRecord(record, accessUrl),
  }
}

export async function generatePetEmergencyAccess(
  ownerId: string,
  petId: string,
  appUrl: string,
  pin: string
) {
  assertValidPin(pin)
  await assertOwnerOwnsPet(ownerId, petId)

  const token = generateAccessToken()
  const accessUrl = `${appUrl.replace(/\/$/, '')}/emergency/pet/${token}`
  const pinHash = await hashPassword(pin)
  const expiresAt = new Date(Date.now() + PET_EMERGENCY_ACCESS_TTL_MS)

  const record = await prisma.petEmergencyAccessToken.upsert({
    where: { petId },
    create: {
      petId,
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
    actorUserId: ownerId,
    actorRole: USER_ROLES.USER,
    patientUserId: ownerId,
    resourceType: 'PetEmergencyAccessToken',
    resourceId: record.id,
    metadata: { petId },
  })

  return formatAccessRecord(record, accessUrl)
}

export async function revokePetEmergencyAccess(ownerId: string, petId: string) {
  await assertOwnerOwnsPet(ownerId, petId)

  const record = await prisma.petEmergencyAccessToken.findUnique({
    where: { petId },
  })

  if (!record) {
    throw new HttpError('No pet emergency QR code found.', 404)
  }

  await prisma.petEmergencyAccessToken.update({
    where: { petId },
    data: { isActive: false },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: ownerId,
    actorRole: USER_ROLES.USER,
    patientUserId: ownerId,
    resourceType: 'PetEmergencyAccessToken',
    resourceId: record.id,
    metadata: { petId, revoked: true },
  })
}

export async function getPublicPetEmergencyChallenge(token: string) {
  const accessRecord = await prisma.petEmergencyAccessToken.findUnique({
    where: { token },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (
    !accessRecord ||
    !accessRecord.isActive ||
    accessRecord.expiresAt <= new Date()
  ) {
    throw new HttpError(
      'Pet emergency access link is invalid, expired, or has been revoked.',
      404
    )
  }

  const petName = decryptPhi(accessRecord.pet.name)

  return {
    needsPin: true as const,
    petInitials: getPetInitials(petName),
    petNameHint: petName.split(/\s+/)[0] ?? 'Pet',
    expiresAt: accessRecord.expiresAt.toISOString(),
  }
}

export async function unlockPublicPetEmergencyRecords(
  token: string,
  pin: string,
  context?: { ip?: string | null; userAgent?: string | null }
) {
  assertValidPin(pin)

  const accessRecord = await prisma.petEmergencyAccessToken.findUnique({
    where: { token },
    include: {
      pet: {
        select: {
          id: true,
          ownerId: true,
        },
      },
    },
  })

  if (
    !accessRecord ||
    !accessRecord.isActive ||
    accessRecord.expiresAt <= new Date()
  ) {
    throw new HttpError(
      'Pet emergency access link is invalid, expired, or has been revoked.',
      404
    )
  }

  if (accessRecord.lockedUntil && accessRecord.lockedUntil > new Date()) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.EMERGENCY_UNLOCK_FAILED,
      patientUserId: accessRecord.pet.ownerId,
      resourceType: 'PetEmergencyAccessToken',
      resourceId: accessRecord.id,
      ip: context?.ip,
      userAgent: context?.userAgent,
      metadata: { reason: 'locked', petId: accessRecord.petId },
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

    await prisma.petEmergencyAccessToken.update({
      where: { id: accessRecord.id },
      data: {
        failedPinAttempts,
        lockedUntil,
      },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.EMERGENCY_UNLOCK_FAILED,
      patientUserId: accessRecord.pet.ownerId,
      resourceType: 'PetEmergencyAccessToken',
      resourceId: accessRecord.id,
      ip: context?.ip,
      userAgent: context?.userAgent,
      metadata: { failedPinAttempts, petId: accessRecord.petId },
    })

    throw new HttpError('Invalid PIN.', 401)
  }

  await prisma.petEmergencyAccessToken.update({
    where: { id: accessRecord.id },
    data: {
      lastAccessedAt: new Date(),
      failedPinAttempts: 0,
      lockedUntil: null,
    },
  })

  const pet = await getPetEmergencyProfile(accessRecord.petId)

  await writeAuditLog({
    action: AUDIT_ACTIONS.EMERGENCY_UNLOCK,
    patientUserId: accessRecord.pet.ownerId,
    resourceType: 'PetEmergencyAccessToken',
    resourceId: accessRecord.id,
    ip: context?.ip,
    userAgent: context?.userAgent,
    metadata: { petId: accessRecord.petId },
  })

  return {
    ...pet,
    accessedAt: new Date().toISOString(),
  }
}
