import type { Medication } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { notifyMedicationAdded, notifyMedicationDiscontinued } from '~/lib/notifications'
import { decryptPhi, encryptPhiRequired } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { resolveVaultPatientId } from '~/lib/vault-access'

type MedicationInput = {
  medicineName: string
  condition: string
  prescribedBy: string
  dosage: string
  timesPerDay: number
  timesOfDay: string[]
  startDate: string
  endDate?: string
}

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function normalizeTimesOfDay(timesPerDay: number, timesOfDay: string[]): string[] {
  if (!Number.isInteger(timesPerDay) || timesPerDay < 1 || timesPerDay > 6) {
    throw new HttpError('Times per day must be between 1 and 6.', 400)
  }

  const normalized = timesOfDay.map(time => time.trim()).filter(Boolean)

  if (normalized.length !== timesPerDay) {
    throw new HttpError('Provide one dose time for each time per day.', 400)
  }

  for (const time of normalized) {
    if (!TIME_OF_DAY_PATTERN.test(time)) {
      throw new HttpError('Dose times must use HH:mm (24-hour) format.', 400)
    }
  }

  return normalized
}

function formatMedicationDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

function parseMedicationDate(value: string, fieldLabel: string): Date {
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

function parseOptionalMedicationDate(value: string | undefined, fieldLabel: string): Date | null {
  if (!value?.trim()) {
    return null
  }

  return parseMedicationDate(value, fieldLabel)
}

function toMedicationResponse(record: Medication) {
  return {
    id: record.id,
    medicineName: decryptPhi(record.medicineName),
    condition: decryptPhi(record.condition),
    prescribedBy: decryptPhi(record.prescribedBy),
    dosage: decryptPhi(record.dosage),
    timesPerDay: record.timesPerDay,
    timesOfDay: record.timesOfDay,
    startDate: formatMedicationDate(record.startDate),
    endDate: record.endDate ? formatMedicationDate(record.endDate) : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function getOwnedMedication(userId: string, medicationId: string) {
  const record = await prisma.medication.findFirst({
    where: {
      id: medicationId,
      userId,
    },
  })

  if (!record) {
    throw new HttpError('Medication not found.', 404)
  }

  return record
}

export async function listMedications(
  actorUserId: string,
  requestedPatientUserId?: string | null
) {
  const userId = await resolveVaultPatientId(actorUserId, requestedPatientUserId)

  const medications = await prisma.medication.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId,
    patientUserId: userId,
    resourceType: 'Medication',
  })

  return {
    medications: medications.map(toMedicationResponse),
  }
}

export async function createMedication(userId: string, input: MedicationInput) {
  await assertPatientUser(userId)

  const startDate = parseMedicationDate(input.startDate, 'start date')
  const endDate = parseOptionalMedicationDate(input.endDate, 'end date')
  const timesOfDay = normalizeTimesOfDay(input.timesPerDay, input.timesOfDay)

  if (endDate && endDate < startDate) {
    throw new HttpError('End date cannot be before start date.', 400)
  }

  const record = await prisma.medication.create({
    data: {
      userId,
      medicineName: encryptPhiRequired(input.medicineName.trim()),
      condition: encryptPhiRequired(input.condition.trim()),
      prescribedBy: encryptPhiRequired(input.prescribedBy.trim()),
      dosage: encryptPhiRequired(input.dosage.trim()),
      timesPerDay: input.timesPerDay,
      timesOfDay,
      startDate,
      endDate,
    },
  })

  await Promise.all([
    notifyMedicationAdded(userId, toMedicationResponse(record)),
    writeAuditLog({
      action: AUDIT_ACTIONS.PHI_CREATE,
      actorUserId: userId,
      patientUserId: userId,
      resourceType: 'Medication',
      resourceId: record.id,
    }),
  ])

  return toMedicationResponse(record)
}

export async function updateMedication(
  userId: string,
  medicationId: string,
  input: MedicationInput
) {
  await assertPatientUser(userId)
  const existing = await getOwnedMedication(userId, medicationId)

  const startDate = parseMedicationDate(input.startDate, 'start date')
  const endDate = parseOptionalMedicationDate(input.endDate, 'end date')
  const timesOfDay = normalizeTimesOfDay(input.timesPerDay, input.timesOfDay)

  if (endDate && endDate < startDate) {
    throw new HttpError('End date cannot be before start date.', 400)
  }

  const record = await prisma.medication.update({
    where: { id: medicationId },
    data: {
      medicineName: encryptPhiRequired(input.medicineName.trim()),
      condition: encryptPhiRequired(input.condition.trim()),
      prescribedBy: encryptPhiRequired(input.prescribedBy.trim()),
      dosage: encryptPhiRequired(input.dosage.trim()),
      timesPerDay: input.timesPerDay,
      timesOfDay,
      startDate,
      endDate,
    },
  })

  const today = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  )
  const newlyDiscontinued =
    endDate && endDate <= today && (!existing.endDate || existing.endDate > today)

  if (newlyDiscontinued) {
    await notifyMedicationDiscontinued(userId, toMedicationResponse(record))
  }
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'Medication',
    resourceId: record.id,
  })

  return toMedicationResponse(record)
}

export async function deleteMedication(userId: string, medicationId: string) {
  await assertPatientUser(userId)
  const existing = await getOwnedMedication(userId, medicationId)

  await notifyMedicationDiscontinued(userId, toMedicationResponse(existing))

  await prisma.medication.delete({
    where: { id: medicationId },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'Medication',
    resourceId: medicationId,
  })
}
