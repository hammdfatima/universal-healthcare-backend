import { USER_ROLES } from '~/config/roles'
import type { HealthHistoryEntry } from '~/generated/prisma'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'

type HealthHistoryInput = {
  illnessName: string
  diagnosisDate: string
  prescribedBy: string
  details: string
}

function formatHealthHistoryDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

function parseHealthHistoryDate(value: string, fieldLabel: string): Date {
  const trimmed = value.trim()
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)

  if (slashMatch) {
    const month = Number(slashMatch[1])
    const day = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const parsed = new Date(Date.UTC(year, month - 1, day))

    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new HttpError(`Invalid ${fieldLabel}.`, 400)
    }

    return parsed
  }

  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(`Invalid ${fieldLabel}.`, 400)
  }

  return parsed
}

function toHealthHistoryResponse(record: HealthHistoryEntry) {
  return {
    id: record.id,
    illnessName: record.illnessName,
    diagnosisDate: formatHealthHistoryDate(record.diagnosisDate),
    prescribedBy: record.prescribedBy,
    details: record.details,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function assertPatientUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  return user
}

async function getOwnedHealthHistoryEntry(userId: string, entryId: string) {
  const record = await prisma.healthHistoryEntry.findFirst({
    where: {
      id: entryId,
      userId,
    },
  })

  if (!record) {
    throw new HttpError('Health history entry not found.', 404)
  }

  return record
}

export async function listHealthHistoryEntries(userId: string) {
  await assertPatientUser(userId)

  const entries = await prisma.healthHistoryEntry.findMany({
    where: { userId },
    orderBy: { diagnosisDate: 'desc' },
  })

  return {
    entries: entries.map(toHealthHistoryResponse),
  }
}

export async function createHealthHistoryEntry(
  userId: string,
  input: HealthHistoryInput
) {
  await assertPatientUser(userId)

  const record = await prisma.healthHistoryEntry.create({
    data: {
      userId,
      illnessName: input.illnessName.trim(),
      diagnosisDate: parseHealthHistoryDate(
        input.diagnosisDate,
        'date of diagnosis'
      ),
      prescribedBy: input.prescribedBy.trim(),
      details: input.details.trim(),
    },
  })

  return toHealthHistoryResponse(record)
}

export async function updateHealthHistoryEntry(
  userId: string,
  entryId: string,
  input: HealthHistoryInput
) {
  await assertPatientUser(userId)
  await getOwnedHealthHistoryEntry(userId, entryId)

  const record = await prisma.healthHistoryEntry.update({
    where: { id: entryId },
    data: {
      illnessName: input.illnessName.trim(),
      diagnosisDate: parseHealthHistoryDate(
        input.diagnosisDate,
        'date of diagnosis'
      ),
      prescribedBy: input.prescribedBy.trim(),
      details: input.details.trim(),
    },
  })

  return toHealthHistoryResponse(record)
}

export async function deleteHealthHistoryEntry(userId: string, entryId: string) {
  await assertPatientUser(userId)
  await getOwnedHealthHistoryEntry(userId, entryId)

  await prisma.healthHistoryEntry.delete({
    where: { id: entryId },
  })
}
