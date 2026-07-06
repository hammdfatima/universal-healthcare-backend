import { USER_ROLES } from '~/config/roles'
import type { FamilyMember, User } from '~/generated/prisma'
import { HttpError } from '~/lib/error'
import {
  getFamilyMemberLimit,
  getPlanTier,
  supportsFamilyMembers,
} from '~/lib/plan-tier'
import { hashPassword } from '~/lib/password'
import prisma from '~/lib/prisma'
import { sendFamilyMemberWelcomeEmail } from '~/lib/email'
import { isSubscriptionActive } from '~/routes/subscriptions/subscriptions.service'

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

function toFamilyMemberResponse(
  record: FamilyMember & {
    memberUser: User
  }
) {
  return {
    id: record.id,
    memberUserId: record.memberUserId,
    firstName: record.memberUser.firstName ?? '',
    lastName: record.memberUser.lastName ?? '',
    email: record.memberUser.email,
    phone: record.memberUser.phone,
    relationship: record.relationship,
    dateOfBirth: formatDateOfBirth(record.memberUser.dateOfBirth),
    isEmergencyContact: record.isEmergencyContact,
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

function assertOwnerCanManageFamily(owner: Awaited<ReturnType<typeof getOwnerWithSubscription>>) {
  const subscription = owner.subscription

  if (!subscription || !isSubscriptionActive(subscription.status)) {
    throw new HttpError('An active subscription is required to manage family members.', 403)
  }

  const tier = getPlanTier(subscription.subscriptionPlan.planName)

  if (!supportsFamilyMembers(tier)) {
    throw new HttpError('Your current plan does not include family member profiles.', 403)
  }

  return {
    tier,
    limit: getFamilyMemberLimit(tier),
    subscription,
  }
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
  const { limit } = assertOwnerCanManageFamily(owner)

  const members = await prisma.familyMember.findMany({
    where: { ownerId },
    include: { memberUser: true },
    orderBy: { createdAt: 'asc' },
  })

  return {
    members: members.map(toFamilyMemberResponse),
    limit,
  }
}

export async function createFamilyMember(ownerId: string, input: CreateFamilyMemberInput) {
  const owner = await getOwnerWithSubscription(ownerId)
  const { tier, limit, subscription } = assertOwnerCanManageFamily(owner)

  if (tier === 'couple' && input.relationship.trim() !== 'Spouse') {
    throw new HttpError("Couple plans can only add a spouse profile.", 400)
  }

  const existingCount = await prisma.familyMember.count({
    where: { ownerId },
  })

  if (existingCount >= limit) {
    throw new HttpError(
      tier === 'couple'
        ? "Your couple's plan allows only one spouse profile."
        : `Your family plan allows up to ${limit} members.`,
      400
    )
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
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone: input.phone.trim(),
        dateOfBirth,
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
        relationship: tier === 'couple' ? 'Spouse' : input.relationship.trim(),
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

  return toFamilyMemberResponse(record)
}

export async function updateFamilyMember(
  ownerId: string,
  familyMemberId: string,
  input: UpdateFamilyMemberInput
) {
  const owner = await getOwnerWithSubscription(ownerId)
  const { tier } = assertOwnerCanManageFamily(owner)
  const record = await getOwnedFamilyMember(ownerId, familyMemberId)

  if (tier === 'couple' && input.relationship.trim() !== 'Spouse') {
    throw new HttpError("Couple plans can only manage a spouse profile.", 400)
  }

  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const dateOfBirth = parseDateOfBirth(input.dateOfBirth)

  const updated = await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: record.memberUserId },
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone: input.phone.trim(),
        dateOfBirth,
      },
    })

    return tx.familyMember.update({
      where: { id: record.id },
      data: {
        relationship: tier === 'couple' ? 'Spouse' : input.relationship.trim(),
        isEmergencyContact: input.isEmergencyContact,
      },
      include: {
        memberUser: true,
      },
    })
  })

  return toFamilyMemberResponse(updated)
}

export async function deleteFamilyMember(ownerId: string, familyMemberId: string) {
  const owner = await getOwnerWithSubscription(ownerId)
  assertOwnerCanManageFamily(owner)

  const record = await getOwnedFamilyMember(ownerId, familyMemberId)

  await prisma.familyMember.delete({
    where: { id: record.id },
  })
}
