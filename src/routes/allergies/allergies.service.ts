import { USER_ROLES } from '~/config/roles'
import type { Allergy } from '~/generated/prisma'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'
import { ALLERGY_TYPE_FOOD } from '~/routes/allergies/allergies.schemas'

type AllergyInput = {
  allergyType: string
  nature: string
  symptoms: string[]
  triggers: string[]
}

function toAllergyResponse(record: Allergy) {
  return {
    id: record.id,
    allergyType: record.allergyType,
    nature: record.nature,
    symptoms: record.symptoms,
    triggers: record.triggers,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function normalizeAllergyInput(input: AllergyInput): AllergyInput {
  const allergyType = input.allergyType.trim()
  const triggers =
    allergyType === ALLERGY_TYPE_FOOD
      ? input.triggers.map(item => item.trim()).filter(Boolean)
      : []

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

export async function listAllergies(userId: string) {
  await assertPatientUser(userId)

  const allergies = await prisma.allergy.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
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
      ...normalized,
    },
  })

  return toAllergyResponse(record)
}

export async function updateAllergy(
  userId: string,
  allergyId: string,
  input: AllergyInput
) {
  await assertPatientUser(userId)
  await getOwnedAllergy(userId, allergyId)

  const normalized = normalizeAllergyInput(input)

  const record = await prisma.allergy.update({
    where: { id: allergyId },
    data: normalized,
  })

  return toAllergyResponse(record)
}

export async function deleteAllergy(userId: string, allergyId: string) {
  await assertPatientUser(userId)
  await getOwnedAllergy(userId, allergyId)

  await prisma.allergy.delete({
    where: { id: allergyId },
  })
}
