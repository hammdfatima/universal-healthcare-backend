import type { Allergy } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import {
  decryptPhi,
  decryptStringArray,
  encryptPhiRequired,
  encryptStringArray,
} from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { ALLERGY_TYPE_FOOD } from '~/routes/allergies/allergies.schemas'
import { resolveVaultPatientId } from '~/lib/vault-access'

type AllergyInput = {
  allergyType: string
  nature: string
  symptoms: string[]
  triggers: string[]
}

function toAllergyResponse(record: Allergy) {
  return {
    id: record.id,
    allergyType: decryptPhi(record.allergyType),
    nature: decryptPhi(record.nature),
    symptoms: decryptStringArray(record.symptoms),
    triggers: decryptStringArray(record.triggers),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function normalizeAllergyInput(input: AllergyInput): AllergyInput {
  const allergyType = input.allergyType.trim()
  const triggers =
    allergyType === ALLERGY_TYPE_FOOD ? input.triggers.map(item => item.trim()).filter(Boolean) : []

  if (allergyType === ALLERGY_TYPE_FOOD && triggers.length === 0) {
    throw new HttpError('Select at least one food trigger.', 400)
  }

  const symptoms = input.symptoms.map(item => item.trim()).filter(Boolean)

  if (symptoms.length === 0) {
    throw new HttpError('Select at least one symptom.', 400)
  }

  return {
    allergyType,
    nature: input.nature.trim(),
    symptoms,
    triggers,
  }
}

async function getOwnedAllergy(userId: string, allergyId: string) {
  const record = await prisma.allergy.findFirst({
    where: {
      id: allergyId,
      userId,
    },
  })

  if (!record) {
    throw new HttpError('Allergy not found.', 404)
  }

  return record
}

export async function listAllergies(
  actorUserId: string,
  requestedPatientUserId?: string | null
) {
  const userId = await resolveVaultPatientId(actorUserId, requestedPatientUserId)

  const allergies = await prisma.allergy.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId,
    patientUserId: userId,
    resourceType: 'Allergy',
  })

  return {
    allergies: allergies.map(toAllergyResponse),
  }
}

export async function createAllergy(userId: string, input: AllergyInput) {
  await assertPatientUser(userId)

  const normalized = normalizeAllergyInput(input)

  const record = await prisma.allergy.create({
    data: {
      userId,
      allergyType: encryptPhiRequired(normalized.allergyType),
      nature: encryptPhiRequired(normalized.nature),
      symptoms: encryptStringArray(normalized.symptoms),
      triggers: encryptStringArray(normalized.triggers),
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_CREATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'Allergy',
    resourceId: record.id,
  })

  return toAllergyResponse(record)
}

export async function updateAllergy(userId: string, allergyId: string, input: AllergyInput) {
  await assertPatientUser(userId)
  await getOwnedAllergy(userId, allergyId)

  const normalized = normalizeAllergyInput(input)

  const record = await prisma.allergy.update({
    where: { id: allergyId },
    data: {
      allergyType: encryptPhiRequired(normalized.allergyType),
      nature: encryptPhiRequired(normalized.nature),
      symptoms: encryptStringArray(normalized.symptoms),
      triggers: encryptStringArray(normalized.triggers),
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'Allergy',
    resourceId: record.id,
  })

  return toAllergyResponse(record)
}

export async function deleteAllergy(userId: string, allergyId: string) {
  await assertPatientUser(userId)
  await getOwnedAllergy(userId, allergyId)

  await prisma.allergy.delete({
    where: { id: allergyId },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'Allergy',
    resourceId: allergyId,
  })
}
