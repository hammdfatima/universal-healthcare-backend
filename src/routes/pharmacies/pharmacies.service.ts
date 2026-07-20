import type { Pharmacy } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import {
  notifyPharmacyAdded,
  notifyPharmacyRemoved,
  notifyPharmacyUpdated,
} from '~/lib/notifications'
import {
  decryptPhi,
  decryptPhiNullable,
  encryptPhiNullable,
  encryptPhiRequired,
} from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { resolveVaultPatientId } from '~/lib/vault-access'

type PharmacyInput = {
  name: string
  phone: string
  address: string
  notes?: string
}

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  return trimmed
}

function toPharmacyResponse(record: Pharmacy) {
  return {
    id: record.id,
    name: decryptPhi(record.name),
    phone: decryptPhi(record.phone),
    address: decryptPhiNullable(record.address),
    notes: decryptPhiNullable(record.notes),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function getOwnedPharmacy(userId: string, pharmacyId: string) {
  const record = await prisma.pharmacy.findFirst({
    where: {
      id: pharmacyId,
      userId,
    },
  })

  if (!record) {
    throw new HttpError('Pharmacy not found.', 404)
  }

  return record
}

export async function listPharmacies(
  actorUserId: string,
  requestedPatientUserId?: string | null
) {
  const userId = await resolveVaultPatientId(actorUserId, requestedPatientUserId)

  const pharmacies = await prisma.pharmacy.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId,
    patientUserId: userId,
    resourceType: 'Pharmacy',
  })

  return {
    pharmacies: pharmacies.map(toPharmacyResponse),
  }
}

export async function createPharmacy(userId: string, input: PharmacyInput) {
  await assertPatientUser(userId)

  const record = await prisma.pharmacy.create({
    data: {
      userId,
      name: encryptPhiRequired(input.name.trim()),
      phone: encryptPhiRequired(input.phone.trim()),
      address: encryptPhiRequired(input.address.trim()),
      notes: encryptPhiNullable(normalizeOptionalText(input.notes)),
    },
  })

  await Promise.all([
    notifyPharmacyAdded(userId, toPharmacyResponse(record)),
    writeAuditLog({
      action: AUDIT_ACTIONS.PHI_CREATE,
      actorUserId: userId,
      patientUserId: userId,
      resourceType: 'Pharmacy',
      resourceId: record.id,
    }),
  ])

  return toPharmacyResponse(record)
}

export async function updatePharmacy(userId: string, pharmacyId: string, input: PharmacyInput) {
  await assertPatientUser(userId)
  await getOwnedPharmacy(userId, pharmacyId)

  const record = await prisma.pharmacy.update({
    where: { id: pharmacyId },
    data: {
      name: encryptPhiRequired(input.name.trim()),
      phone: encryptPhiRequired(input.phone.trim()),
      address: encryptPhiRequired(input.address.trim()),
      notes: encryptPhiNullable(normalizeOptionalText(input.notes)),
    },
  })

  await Promise.all([
    notifyPharmacyUpdated(userId, toPharmacyResponse(record)),
    writeAuditLog({
      action: AUDIT_ACTIONS.PHI_UPDATE,
      actorUserId: userId,
      patientUserId: userId,
      resourceType: 'Pharmacy',
      resourceId: record.id,
    }),
  ])

  return toPharmacyResponse(record)
}

export async function deletePharmacy(userId: string, pharmacyId: string) {
  await assertPatientUser(userId)
  const existing = await getOwnedPharmacy(userId, pharmacyId)

  await notifyPharmacyRemoved(userId, toPharmacyResponse(existing))

  await prisma.pharmacy.delete({
    where: { id: pharmacyId },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'Pharmacy',
    resourceId: pharmacyId,
  })
}
