import type { Vaccination } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { notifyVaccinationAdded } from '~/lib/notifications'
import { decryptPhi, encryptPhiRequired } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { resolveVaultPatientId } from '~/lib/vault-access'

type VaccinationInput = {
  vaccineName: string
  prescribedBy: string
  administeredBy: string
  dosage: string
  date: string
  time: string
}

function formatVaccinationDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

function parseVaccinationDate(value: string, fieldLabel: string): Date {
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

function formatVaccinationTime(value: string): string {
  const trimmed = value.trim()
  const amPmMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed)

  if (amPmMatch) {
    const hour = Number(amPmMatch[1])
    const minute = amPmMatch[2]
    const period = amPmMatch[3].toUpperCase()

    if (hour < 1 || hour > 12) {
      throw new HttpError('Invalid time.', 400)
    }

    return `${hour}:${minute} ${period}`
  }

  const h24Match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)

  if (h24Match) {
    const hour24 = Number(h24Match[1])
    const minute = h24Match[2]

    if (hour24 < 0 || hour24 > 23 || Number(minute) > 59) {
      throw new HttpError('Invalid time.', 400)
    }

    const period = hour24 >= 12 ? 'PM' : 'AM'
    let hour12 = hour24 % 12
    if (hour12 === 0) {
      hour12 = 12
    }

    return `${hour12}:${minute} ${period}`
  }

  throw new HttpError('Invalid time.', 400)
}

function toVaccinationResponse(record: Vaccination) {
  return {
    id: record.id,
    vaccineName: decryptPhi(record.vaccineName),
    prescribedBy: decryptPhi(record.prescribedBy),
    administeredBy: decryptPhi(record.administeredBy),
    dosage: decryptPhi(record.dosage),
    date: formatVaccinationDate(record.vaccinationDate),
    time: decryptPhi(record.time),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function getOwnedVaccination(userId: string, vaccinationId: string) {
  const record = await prisma.vaccination.findFirst({
    where: {
      id: vaccinationId,
      userId,
    },
  })

  if (!record) {
    throw new HttpError('Vaccination not found.', 404)
  }

  return record
}

export async function listVaccinations(
  actorUserId: string,
  requestedPatientUserId?: string | null
) {
  const userId = await resolveVaultPatientId(actorUserId, requestedPatientUserId)

  const vaccinations = await prisma.vaccination.findMany({
    where: { userId },
    orderBy: { vaccinationDate: 'desc' },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId,
    patientUserId: userId,
    resourceType: 'Vaccination',
  })

  return {
    vaccinations: vaccinations.map(toVaccinationResponse),
  }
}

export async function createVaccination(userId: string, input: VaccinationInput) {
  await assertPatientUser(userId)

  const record = await prisma.vaccination.create({
    data: {
      userId,
      vaccineName: encryptPhiRequired(input.vaccineName.trim()),
      prescribedBy: encryptPhiRequired(input.prescribedBy.trim()),
      administeredBy: encryptPhiRequired(input.administeredBy.trim()),
      dosage: encryptPhiRequired(input.dosage.trim()),
      vaccinationDate: parseVaccinationDate(input.date, 'date'),
      time: encryptPhiRequired(formatVaccinationTime(input.time)),
    },
  })

  await Promise.all([
    notifyVaccinationAdded(userId, toVaccinationResponse(record)),
    writeAuditLog({
      action: AUDIT_ACTIONS.PHI_CREATE,
      actorUserId: userId,
      patientUserId: userId,
      resourceType: 'Vaccination',
      resourceId: record.id,
    }),
  ])

  return toVaccinationResponse(record)
}

export async function updateVaccination(
  userId: string,
  vaccinationId: string,
  input: VaccinationInput
) {
  await assertPatientUser(userId)
  await getOwnedVaccination(userId, vaccinationId)

  const record = await prisma.vaccination.update({
    where: { id: vaccinationId },
    data: {
      vaccineName: encryptPhiRequired(input.vaccineName.trim()),
      prescribedBy: encryptPhiRequired(input.prescribedBy.trim()),
      administeredBy: encryptPhiRequired(input.administeredBy.trim()),
      dosage: encryptPhiRequired(input.dosage.trim()),
      vaccinationDate: parseVaccinationDate(input.date, 'date'),
      time: encryptPhiRequired(formatVaccinationTime(input.time)),
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'Vaccination',
    resourceId: record.id,
  })

  return toVaccinationResponse(record)
}

export async function deleteVaccination(userId: string, vaccinationId: string) {
  await assertPatientUser(userId)
  await getOwnedVaccination(userId, vaccinationId)

  await prisma.vaccination.delete({
    where: { id: vaccinationId },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'Vaccination',
    resourceId: vaccinationId,
  })
}
