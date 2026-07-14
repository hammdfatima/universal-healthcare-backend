import { USER_ROLES } from '~/config/roles'
import type { FamilyMember, User } from '~/generated/prisma'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { sendFamilyMemberWelcomeEmail } from '~/lib/email'
import { HttpError } from '~/lib/error'
import {
  getCoveredMemberUserIdsFromLinks,
} from '~/lib/household-access'
import { countHouseholdSeats } from '~/lib/household-seats'
import { hashPassword } from '~/lib/password'
import {
  decryptDateNullable,
  decryptPhiNullable,
  encryptDateToPhi,
  encryptPhiRequired,
} from '~/lib/phi-crypto'
import type { PlanCapabilities } from '~/lib/plan-tier'
import {
  getFamilyMemberLimit,
  supportsFamilyMembers,
  supportsPets,
} from '~/lib/plan-tier'
import prisma from '~/lib/prisma'
import { isSubscriptionActive } from '~/routes/subscriptions/subscriptions.service'

const HUMAN_RELATIONSHIPS = new Set(['Spouse', 'Child', 'Parent', 'Sibling'])

type CreateFamilyMemberInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  relationship: string
  dateOfBirth: string
  password: string
  isEmergencyContact: boolean
}

type UpdateFamilyMemberInput = {
  firstName: string
  lastName: string
  phone: string
  relationship: string
  dateOfBirth: string
  isEmergencyContact: boolean
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

function parseDateOfBirth(value: string): Date {
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

function assertHumanRelationship(relationship: string, memberLimit: number) {
  const normalized = relationship.trim()

  if (normalized.toLowerCase() === 'pet') {
    throw new HttpError(
      'Pets are managed from the Pets tab and do not use a separate login account.',
      400
    )
  }

  if (memberLimit === 1) {
    if (normalized !== 'Spouse') {
      throw new HttpError('This plan can only add a spouse profile.', 400)
    }
    return 'Spouse'
  }

  if (!HUMAN_RELATIONSHIPS.has(normalized)) {
    throw new HttpError(
      'Relationship must be Spouse, Child, Parent, or Sibling. Add pets from the Pets tab.',
      400
    )
  }

  return normalized
}

function toFamilyMemberResponse(
  record: FamilyMember & {
    memberUser: User
  },
  isAccessible: boolean
) {
  return {
    id: record.id,
    memberUserId: record.memberUserId,
    firstName: decryptPhiNullable(record.memberUser.firstName) ?? '',
    lastName: decryptPhiNullable(record.memberUser.lastName) ?? '',
    email: record.memberUser.email,
    phone: decryptPhiNullable(record.memberUser.phone),
    relationship: record.relationship,
    dateOfBirth: formatDateOfBirth(decryptDateNullable(record.memberUser.dateOfBirth)),
    isEmergencyContact: record.isEmergencyContact,
    isAccessible,
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
    throw new HttpError('Only the primary account holder can manage family members.', 403)
  }

  return owner
}

function assertOwnerHasActiveSubscription(
  owner: Awaited<ReturnType<typeof getOwnerWithSubscription>>
) {
  const subscription = owner.subscription

  if (!subscription || !isSubscriptionActive(subscription.status)) {
    throw new HttpError('An active subscription is required to manage family members.', 403)
  }

  const capabilities: PlanCapabilities = {
    memberLimit: subscription.subscriptionPlan.memberLimit,
    allowsPets: subscription.subscriptionPlan.allowsPets,
  }

  return {
    capabilities,
    limit: getFamilyMemberLimit(capabilities),
    subscription,
  }
}

function assertOwnerCanManageFamily(owner: Awaited<ReturnType<typeof getOwnerWithSubscription>>) {
  const result = assertOwnerHasActiveSubscription(owner)

  if (!supportsFamilyMembers(result.capabilities)) {
    throw new HttpError('Your current plan does not include family member profiles.', 403)
  }

  return result
}

async function getOwnedFamilyMember(ownerId: string, familyMemberId: string) {
  const record = await prisma.familyMember.findFirst({
    where: {
      id: familyMemberId,
      ownerId,
    },
    include: {
      memberUser: true,
    },
  })

  if (!record) {
    throw new HttpError('Family member not found.', 404)
  }

  return record
}

export async function listFamilyMembers(ownerId: string) {
  const owner = await getOwnerWithSubscription(ownerId)
  const { capabilities, limit } = assertOwnerHasActiveSubscription(owner)

  const [members, seats] = await Promise.all([
    prisma.familyMember.findMany({
      where: { ownerId },
      include: { memberUser: true },
      orderBy: { createdAt: 'asc' },
    }),
    countHouseholdSeats(ownerId),
  ])

  const covered = getCoveredMemberUserIdsFromLinks(
    limit,
    members.map(member => ({
      memberUserId: member.memberUserId,
      relationship: member.relationship,
      createdAt: member.createdAt,
    }))
  )

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId: ownerId,
    patientUserId: ownerId,
    resourceType: 'FamilyMemberProfile',
  })

  return {
    members: members.map(member =>
      toFamilyMemberResponse(member, covered.has(member.memberUserId))
    ),
    limit,
    usedSeats: seats.usedSeats,
    petCount: seats.petCount,
    pausedPetCount: seats.pausedPetCount,
    canManage: supportsFamilyMembers(capabilities),
    supportsPets: supportsPets(capabilities),
  }
}

export async function createFamilyMember(ownerId: string, input: CreateFamilyMemberInput) {
  const owner = await getOwnerWithSubscription(ownerId)
  const { limit, subscription } = assertOwnerCanManageFamily(owner)
  const relationship = assertHumanRelationship(input.relationship, limit)

  const seats = await countHouseholdSeats(ownerId)

  if (seats.usedSeats >= limit) {
    throw new HttpError(
      limit === 1
        ? 'Your plan allows only one spouse profile.'
        : `Your plan allows up to ${limit} household members including pets.`,
      400
    )
  }

  if (limit === 1) {
    const existingSpouse = await prisma.familyMember.findFirst({
      where: {
        ownerId,
        relationship: 'Spouse',
      },
    })

    if (existingSpouse) {
      throw new HttpError('Your plan already includes a spouse profile.', 400)
    }
  }

  const email = input.email.toLowerCase().trim()
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    throw new HttpError('An account with this email already exists.', 409)
  }

  const passwordHash = await hashPassword(input.password)
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const dateOfBirth = parseDateOfBirth(input.dateOfBirth)
  const frontendUrl = Bun.env.FRONTEND_URL ?? 'http://localhost:3000'

  const record = await prisma.$transaction(async tx => {
    const memberUser = await tx.user.create({
      data: {
        email,
        firstName: encryptPhiRequired(firstName),
        lastName: encryptPhiRequired(lastName),
        name: encryptPhiRequired(`${firstName} ${lastName}`.trim()),
        phone: encryptPhiRequired(input.phone.trim()),
        dateOfBirth: encryptDateToPhi(dateOfBirth),
        password: passwordHash,
        emailVerified: true,
        onboardingCompleted: true,
        mustChangePassword: true,
        managedByOwnerId: ownerId,
        role: USER_ROLES.USER,
      },
    })

    await tx.userSubscription.create({
      data: {
        userId: memberUser.id,
        subscriptionPlanId: subscription.subscriptionPlanId,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    })

    return tx.familyMember.create({
      data: {
        ownerId,
        memberUserId: memberUser.id,
        relationship,
        isEmergencyContact: input.isEmergencyContact,
      },
      include: {
        memberUser: true,
      },
    })
  })

  await sendFamilyMemberWelcomeEmail({
    to: email,
    firstName,
    loginUrl: `${frontendUrl}/login`,
    email,
    password: input.password,
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_CREATE,
    actorUserId: ownerId,
    patientUserId: record.memberUserId,
    resourceType: 'FamilyMemberProfile',
    resourceId: record.id,
  })

  return toFamilyMemberResponse(record, true)
}

export async function updateFamilyMember(
  ownerId: string,
  familyMemberId: string,
  input: UpdateFamilyMemberInput
) {
  const owner = await getOwnerWithSubscription(ownerId)
  const { limit } = assertOwnerCanManageFamily(owner)
  const record = await getOwnedFamilyMember(ownerId, familyMemberId)

  const links = await prisma.familyMember.findMany({
    where: { ownerId },
    select: { memberUserId: true, relationship: true, createdAt: true },
  })
  const covered = getCoveredMemberUserIdsFromLinks(limit, links)

  if (!covered.has(record.memberUserId)) {
    throw new HttpError(
      'This family profile is paused on your current plan. Upgrade to edit it.',
      403
    )
  }

  const relationship = assertHumanRelationship(input.relationship, limit)

  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const dateOfBirth = parseDateOfBirth(input.dateOfBirth)

  const updated = await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: record.memberUserId },
      data: {
        firstName: encryptPhiRequired(firstName),
        lastName: encryptPhiRequired(lastName),
        name: encryptPhiRequired(`${firstName} ${lastName}`.trim()),
        phone: encryptPhiRequired(input.phone.trim()),
        dateOfBirth: encryptDateToPhi(dateOfBirth),
      },
    })

    return tx.familyMember.update({
      where: { id: record.id },
      data: {
        relationship,
        isEmergencyContact: input.isEmergencyContact,
      },
      include: {
        memberUser: true,
      },
    })
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: ownerId,
    patientUserId: record.memberUserId,
    resourceType: 'FamilyMemberProfile',
    resourceId: record.id,
  })

  return toFamilyMemberResponse(updated, true)
}

export async function deleteFamilyMember(ownerId: string, familyMemberId: string) {
  const owner = await getOwnerWithSubscription(ownerId)
  // Allow delete even on Individual so owners can permanently unlink paused members.
  assertOwnerHasActiveSubscription(owner)

  const record = await getOwnedFamilyMember(ownerId, familyMemberId)

  await prisma.familyMember.delete({
    where: { id: record.id },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: ownerId,
    patientUserId: record.memberUserId,
    resourceType: 'FamilyMemberProfile',
    resourceId: record.id,
  })
}
