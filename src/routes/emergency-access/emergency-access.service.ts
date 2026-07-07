import { randomBytes } from 'node:crypto'
import { USER_ROLES } from '~/config/roles'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'
import { exportPatientData } from '~/routes/patient-settings/patient-settings.service'

function generateAccessToken() {
  return randomBytes(32).toString('hex')
}

function formatAccessRecord(
  record: {
    token: string
    isActive: boolean
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
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastAccessedAt: record.lastAccessedAt?.toISOString() ?? null,
  }
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

  const accessUrl = `${appUrl.replace(/\/$/, '')}/emergency/${record.token}`

  return {
    hasToken: true,
    access: formatAccessRecord(record, accessUrl),
  }
}

export async function generateEmergencyAccess(userId: string, appUrl: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  const token = generateAccessToken()
  const accessUrl = `${appUrl.replace(/\/$/, '')}/emergency/${token}`

  const record = await prisma.emergencyAccessToken.upsert({
    where: { userId },
    create: {
      userId,
      token,
      isActive: true,
    },
    update: {
      token,
      isActive: true,
      lastAccessedAt: null,
    },
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
}

export async function getPublicEmergencyRecords(token: string) {
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

  if (!accessRecord || !accessRecord.isActive) {
    throw new HttpError('Emergency access link is invalid or has been revoked.', 404)
  }

  if (accessRecord.user.role !== USER_ROLES.USER) {
    throw new HttpError('Emergency access link is invalid.', 404)
  }

  await prisma.emergencyAccessToken.update({
    where: { id: accessRecord.id },
    data: { lastAccessedAt: new Date() },
  })

  const records = await exportPatientData(accessRecord.userId)
  const patientName =
    [accessRecord.user.firstName, accessRecord.user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    accessRecord.user.name?.trim() ||
    'Patient'

  return {
    ...records,
    patientName,
    accessedAt: new Date().toISOString(),
  }
}
