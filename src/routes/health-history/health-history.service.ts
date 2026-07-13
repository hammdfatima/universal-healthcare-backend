import type { HealthHistoryEntry } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { decryptPhi, encryptPhiRequired } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { resolveVaultPatientId } from '~/lib/vault-access'

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
    illnessName: decryptPhi(record.illnessName),
    diagnosisDate: formatHealthHistoryDate(record.diagnosisDate),
    prescribedBy: decryptPhi(record.prescribedBy),
    details: decryptPhi(record.details),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
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

export async function listHealthHistoryEntries(
  actorUserId: string,
  requestedPatientUserId?: string | null
) {
  const userId = await resolveVaultPatientId(actorUserId, requestedPatientUserId)

  const entries = await prisma.healthHistoryEntry.findMany({
    where: { userId },
    orderBy: { diagnosisDate: 'desc' },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId,
    patientUserId: userId,
    resourceType: 'HealthHistoryEntry',
  })

  return {
    entries: entries.map(toHealthHistoryResponse),
  }
}

export async function createHealthHistoryEntry(userId: string, input: HealthHistoryInput) {
  await assertPatientUser(userId)

  const record = await prisma.healthHistoryEntry.create({
    data: {
      userId,
      illnessName: encryptPhiRequired(input.illnessName.trim()),
      diagnosisDate: parseHealthHistoryDate(input.diagnosisDate, 'date of diagnosis'),
      prescribedBy: encryptPhiRequired(input.prescribedBy.trim()),
      details: encryptPhiRequired(input.details.trim()),
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_CREATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'HealthHistoryEntry',
    resourceId: record.id,
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
      illnessName: encryptPhiRequired(input.illnessName.trim()),
      diagnosisDate: parseHealthHistoryDate(input.diagnosisDate, 'date of diagnosis'),
      prescribedBy: encryptPhiRequired(input.prescribedBy.trim()),
      details: encryptPhiRequired(input.details.trim()),
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'HealthHistoryEntry',
    resourceId: record.id,
  })

  return toHealthHistoryResponse(record)
}

export async function deleteHealthHistoryEntry(userId: string, entryId: string) {
  await assertPatientUser(userId)
  await getOwnedHealthHistoryEntry(userId, entryId)

  await prisma.healthHistoryEntry.delete({
    where: { id: entryId },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'HealthHistoryEntry',
    resourceId: entryId,
  })
}
