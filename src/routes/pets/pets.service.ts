import { USER_ROLES } from '~/config/roles'
import type { FamilyMember, Pet, User } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { areUsersInSameHousehold, getSharingRecipients } from '~/lib/household'
import { countHouseholdSeats } from '~/lib/household-seats'
import {
  decryptDateNullable,
  decryptPhi,
  decryptPhiNullable,
  encryptDateToPhi,
  encryptPhiNullable,
  encryptPhiRequired,
} from '~/lib/phi-crypto'
import { getFamilyMemberLimit, supportsPets } from '~/lib/plan-tier'
import prisma from '~/lib/prisma'
import { isSubscriptionActive } from '~/routes/subscriptions/subscriptions.service'

type PetMedicationItem = {
  name: string
  dosage?: string
  notes?: string
}

type PetAllergyItem = {
  name: string
  reaction?: string
  notes?: string
}

type PetVaccinationItem = {
  name: string
  dateGiven?: string
  nextDue?: string
  notes?: string
}

type PetInput = {
  name: string
  species: string
  breed?: string
  sex?: string
  color?: string
  dateOfBirth?: string
  microchipId?: string
  veterinaryClinic?: string
  veterinaryPhone?: string
  veterinaryRecords?: string
  medications?: PetMedicationItem[]
  allergies?: PetAllergyItem[]
  vaccinations?: PetVaccinationItem[]
  emergencyContactFamilyMemberId?: string | null
}

type PetWithEmergency = Pet & {
  emergencyContactFamilyMember:
    | (FamilyMember & {
        memberUser: User
      })
    | null
}

function formatDateOfBirth(date: Date | null): string | null {
  if (!date) {
    return null
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

function parseOptionalDateOfBirth(value: string | undefined): Date | null {
  if (!value?.trim()) {
    return null
  }

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
      throw new HttpError('Invalid date of birth.', 400)
    }

    return parsed
  }

  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError('Invalid date of birth.', 400)
  }

  return parsed
}

function encryptJsonList<T>(items: T[] | undefined): string {
  return encryptPhiRequired(JSON.stringify(items ?? []))
}

function decryptJsonList<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(decryptPhi(value)) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toPetResponse(record: PetWithEmergency) {
  const emergency = record.emergencyContactFamilyMember

  return {
    id: record.id,
    name: decryptPhi(record.name),
    species: decryptPhi(record.species),
    breed: decryptPhiNullable(record.breed),
    sex: decryptPhiNullable(record.sex),
    color: decryptPhiNullable(record.color),
    dateOfBirth: formatDateOfBirth(decryptDateNullable(record.dateOfBirth)),
    microchipId: decryptPhiNullable(record.microchipId),
    veterinaryClinic: decryptPhiNullable(record.veterinaryClinic),
    veterinaryPhone: decryptPhiNullable(record.veterinaryPhone),
    veterinaryRecords: decryptPhiNullable(record.veterinaryRecords),
    medications: decryptJsonList<PetMedicationItem>(record.medicationsJson),
    allergies: decryptJsonList<PetAllergyItem>(record.allergiesJson),
    vaccinations: decryptJsonList<PetVaccinationItem>(record.vaccinationsJson),
    emergencyContactFamilyMemberId: record.emergencyContactFamilyMemberId,
    emergencyContact: emergency
      ? {
          id: emergency.id,
          firstName: decryptPhiNullable(emergency.memberUser.firstName) ?? '',
          lastName: decryptPhiNullable(emergency.memberUser.lastName) ?? '',
          relationship: emergency.relationship,
          phone: decryptPhiNullable(emergency.memberUser.phone),
          email: emergency.memberUser.email,
        }
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function getOwnerWithSubscription(ownerId: string) {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    include: {
      subscription: {
        include: {
          subscriptionPlan: true,
        },
      },
    },
  })

  if (!owner) {
    throw new HttpError('User not found.', 404)
  }

  if (owner.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  if (owner.managedByOwnerId) {
    throw new HttpError('Only the primary account holder can manage pets.', 403)
  }

  return owner
}

function assertOwnerHasActiveSubscription(
  owner: Awaited<ReturnType<typeof getOwnerWithSubscription>>
) {
  const subscription = owner.subscription

  if (!subscription || !isSubscriptionActive(subscription.status)) {
    throw new HttpError('An active subscription is required to manage pets.', 403)
  }

  const capabilities = {
    memberLimit: subscription.subscriptionPlan.memberLimit,
    allowsPets: subscription.subscriptionPlan.allowsPets,
  }

  return {
    capabilities,
    limit: getFamilyMemberLimit(capabilities),
  }
}

function assertOwnerCanManagePets(owner: Awaited<ReturnType<typeof getOwnerWithSubscription>>) {
  const result = assertOwnerHasActiveSubscription(owner)

  if (!supportsPets(result.capabilities)) {
    throw new HttpError(
      'Pet profiles are not included on your current plan. Upgrade to a plan that allows pets.',
      403
    )
  }

  return result
}

async function assertEmergencyContactBelongsToOwner(
  ownerId: string,
  familyMemberId: string | null | undefined
) {
  if (!familyMemberId) {
    return null
  }

  const member = await prisma.familyMember.findFirst({
    where: {
      id: familyMemberId,
      ownerId,
    },
  })

  if (!member) {
    throw new HttpError('Selected emergency contact must be a family member on your account.', 400)
  }

  return familyMemberId
}

async function getOwnedPet(ownerId: string, petId: string) {
  const record = await prisma.pet.findFirst({
    where: {
      id: petId,
      ownerId,
    },
    include: {
      emergencyContactFamilyMember: {
        include: {
          memberUser: true,
        },
      },
    },
  })

  if (!record) {
    throw new HttpError('Pet not found.', 404)
  }

  return record
}

function toPetWriteData(input: PetInput, emergencyContactFamilyMemberId: string | null) {
  const dateOfBirth = parseOptionalDateOfBirth(input.dateOfBirth)

  return {
    name: encryptPhiRequired(input.name.trim()),
    species: encryptPhiRequired(input.species.trim()),
    breed: encryptPhiNullable(emptyToNull(input.breed)),
    sex: encryptPhiNullable(emptyToNull(input.sex)),
    color: encryptPhiNullable(emptyToNull(input.color)),
    dateOfBirth: dateOfBirth ? encryptDateToPhi(dateOfBirth) : null,
    microchipId: encryptPhiNullable(emptyToNull(input.microchipId)),
    veterinaryClinic: encryptPhiNullable(emptyToNull(input.veterinaryClinic)),
    veterinaryPhone: encryptPhiNullable(emptyToNull(input.veterinaryPhone)),
    veterinaryRecords: encryptPhiNullable(emptyToNull(input.veterinaryRecords)),
    medicationsJson: encryptJsonList(input.medications),
    allergiesJson: encryptJsonList(input.allergies),
    vaccinationsJson: encryptJsonList(input.vaccinations),
    emergencyContactFamilyMemberId,
  }
}

export async function listPets(ownerId: string) {
  const owner = await getOwnerWithSubscription(ownerId)
  const { capabilities, limit } = assertOwnerHasActiveSubscription(owner)
  const seats = await countHouseholdSeats(ownerId)

  if (!supportsPets(capabilities)) {
    return {
      pets: [],
      limit,
      usedSeats: seats.usedSeats,
      memberCount: seats.accessibleMemberCount,
      pausedPetCount: seats.pausedPetCount,
      supportsPets: false,
    }
  }

  const pets = await prisma.pet.findMany({
    where: { ownerId },
    include: {
      emergencyContactFamilyMember: {
        include: {
          memberUser: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId: ownerId,
    patientUserId: ownerId,
    resourceType: 'PetProfile',
  })

  return {
    pets: pets.map(toPetResponse),
    limit,
    usedSeats: seats.usedSeats,
    memberCount: seats.memberCount,
    pausedPetCount: 0,
    supportsPets: true,
  }
}

export async function getPetSharingSettings(ownerId: string, petId: string) {
  const owner = await getOwnerWithSubscription(ownerId)
  assertOwnerCanManagePets(owner)
  const pet = await getOwnedPet(ownerId, petId)

  const [recipients, shares] = await Promise.all([
    getSharingRecipients(ownerId),
    prisma.petShare.findMany({
      where: { petId },
      select: { granteeUserId: true },
    }),
  ])
  const sharedIds = new Set(shares.map(share => share.granteeUserId))

  return {
    petId: pet.id,
    petName: decryptPhi(pet.name),
    members: recipients.map(member => ({
      ...member,
      isSharedWith: sharedIds.has(member.userId),
    })),
  }
}

export async function updatePetSharingSettings(
  ownerId: string,
  petId: string,
  input: { granteeUserIds: string[] }
) {
  const owner = await getOwnerWithSubscription(ownerId)
  assertOwnerCanManagePets(owner)
  await getOwnedPet(ownerId, petId)

  const recipients = await getSharingRecipients(ownerId)
  const allowedIds = new Set(recipients.map(member => member.userId))
  const uniqueGrantees = [...new Set(input.granteeUserIds)].filter(id => id !== ownerId)

  for (const granteeUserId of uniqueGrantees) {
    if (!allowedIds.has(granteeUserId)) {
      throw new HttpError('You can only share pet data with members of your household.', 400)
    }
  }

  await prisma.$transaction(async tx => {
    await tx.petShare.deleteMany({ where: { petId } })

    if (uniqueGrantees.length > 0) {
      await tx.petShare.createMany({
        data: uniqueGrantees.map(granteeUserId => ({
          petId,
          granteeUserId,
        })),
      })
    }
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: ownerId,
    patientUserId: ownerId,
    resourceType: 'PetShare',
    resourceId: petId,
    metadata: { granteeCount: uniqueGrantees.length },
  })

  return getPetSharingSettings(ownerId, petId)
}

export async function listSharedPets(viewerUserId: string, ownerId: string) {
  if (viewerUserId === ownerId) {
    await assertPatientUser(viewerUserId)
    const ownPets = await listPets(ownerId)
    return { pets: ownPets.pets }
  }

  const [, owner, viewer, pets] = await Promise.all([
    assertPatientUser(viewerUserId),
    getOwnerWithSubscription(ownerId),
    prisma.user.findUnique({
      where: { id: viewerUserId },
      select: { managedByOwnerId: true },
    }),
    prisma.pet.findMany({
      where: {
        ownerId,
        shares: { some: { granteeUserId: viewerUserId } },
      },
      include: {
        emergencyContactFamilyMember: {
          include: { memberUser: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  assertOwnerCanManagePets(owner)

  // A covered managed member is already validated by requirePatient. Avoid the
  // expensive generic household traversal for this common shared-pet path.
  const directlyManagedByOwner = viewer?.managedByOwnerId === ownerId
  if (
    !directlyManagedByOwner &&
    !(await areUsersInSameHousehold(viewerUserId, ownerId))
  ) {
    throw new HttpError('You do not have access to these pet profiles.', 403)
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId: viewerUserId,
    patientUserId: ownerId,
    resourceType: 'PetProfile',
    metadata: { shared: true, petCount: pets.length },
  })

  return { pets: pets.map(toPetResponse) }
}

export async function createPet(ownerId: string, input: PetInput) {
  const owner = await getOwnerWithSubscription(ownerId)
  const { limit } = assertOwnerCanManagePets(owner)
  const seats = await countHouseholdSeats(ownerId)

  if (seats.usedSeats >= limit) {
    throw new HttpError(
      `Your family plan allows up to ${limit} household members including pets.`,
      400
    )
  }

  const emergencyContactFamilyMemberId = await assertEmergencyContactBelongsToOwner(
    ownerId,
    input.emergencyContactFamilyMemberId
  )

  const record = await prisma.pet.create({
    data: {
      ownerId,
      ...toPetWriteData(input, emergencyContactFamilyMemberId),
    },
    include: {
      emergencyContactFamilyMember: {
        include: {
          memberUser: true,
        },
      },
    },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_CREATE,
    actorUserId: ownerId,
    patientUserId: ownerId,
    resourceType: 'PetProfile',
    resourceId: record.id,
  })

  return toPetResponse(record)
}

export async function updatePet(ownerId: string, petId: string, input: PetInput) {
  const owner = await getOwnerWithSubscription(ownerId)
  assertOwnerCanManagePets(owner)
  await getOwnedPet(ownerId, petId)

  const emergencyContactFamilyMemberId = await assertEmergencyContactBelongsToOwner(
    ownerId,
    input.emergencyContactFamilyMemberId
  )

  const record = await prisma.pet.update({
    where: { id: petId },
    data: toPetWriteData(input, emergencyContactFamilyMemberId),
    include: {
      emergencyContactFamilyMember: {
        include: {
          memberUser: true,
        },
      },
    },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: ownerId,
    patientUserId: ownerId,
    resourceType: 'PetProfile',
    resourceId: record.id,
  })

  return toPetResponse(record)
}

export async function deletePet(ownerId: string, petId: string) {
  const owner = await getOwnerWithSubscription(ownerId)
  assertOwnerCanManagePets(owner)
  const record = await getOwnedPet(ownerId, petId)

  await prisma.pet.delete({
    where: { id: record.id },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: ownerId,
    patientUserId: ownerId,
    resourceType: 'PetProfile',
    resourceId: record.id,
  })
}
