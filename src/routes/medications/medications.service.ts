import { USER_ROLES } from '~/config/roles'
import type { Medication } from '~/generated/prisma'
import { HttpError } from '~/lib/error'
import {
  notifyMedicationAdded,
  notifyMedicationDiscontinued,
} from '~/lib/notifications'
import prisma from '~/lib/prisma'

type MedicationInput = {
  medicineName: string
  condition: string
  prescribedBy: string
  dosage: string
  startDate: string
  endDate?: string
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

function parseOptionalMedicationDate(
  value: string | undefined,
  fieldLabel: string
): Date | null {
  if (!value?.trim()) {
    return null
  }

  return parseMedicationDate(value, fieldLabel)
}

function toMedicationResponse(record: Medication) {
  return {
    id: record.id,
    medicineName: record.medicineName,
    condition: record.condition,
    prescribedBy: record.prescribedBy,
    dosage: record.dosage,
    startDate: formatMedicationDate(record.startDate),
    endDate: record.endDate ? formatMedicationDate(record.endDate) : null,
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

export async function listMedications(userId: string) {
  await assertPatientUser(userId)

  const medications = await prisma.medication.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return {
    medications: medications.map(toMedicationResponse),
  }
}

export async function createMedication(userId: string, input: MedicationInput) {
  await assertPatientUser(userId)

  const startDate = parseMedicationDate(input.startDate, 'start date')
  const endDate = parseOptionalMedicationDate(input.endDate, 'end date')

  if (endDate && endDate < startDate) {
    throw new HttpError('End date cannot be before start date.', 400)
  }

  const record = await prisma.medication.create({
    data: {
      userId,
      medicineName: input.medicineName.trim(),
      condition: input.condition.trim(),
      prescribedBy: input.prescribedBy.trim(),
      dosage: input.dosage.trim(),
      startDate,
      endDate,
    },
  })

  await notifyMedicationAdded(userId, record)

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

  if (endDate && endDate < startDate) {
    throw new HttpError('End date cannot be before start date.', 400)
  }

  const record = await prisma.medication.update({
    where: { id: medicationId },
    data: {
      medicineName: input.medicineName.trim(),
      condition: input.condition.trim(),
      prescribedBy: input.prescribedBy.trim(),
      dosage: input.dosage.trim(),
      startDate,
      endDate,
    },
  })

  const today = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  ))
  const newlyDiscontinued =
    endDate &&
    endDate <= today &&
    (!existing.endDate || existing.endDate > today)

  if (newlyDiscontinued) {
    await notifyMedicationDiscontinued(userId, record)
  }

  return toMedicationResponse(record)
}

export async function deleteMedication(userId: string, medicationId: string) {
  await assertPatientUser(userId)
  const existing = await getOwnedMedication(userId, medicationId)

  await notifyMedicationDiscontinued(userId, existing)

  await prisma.medication.delete({
    where: { id: medicationId },
  })
}
