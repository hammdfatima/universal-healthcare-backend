import { USER_ROLES } from '~/config/roles'
import type { SubscriptionStatus, User } from '~/generated/prisma'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { decryptPhiNullable } from '~/lib/phi-crypto'
import { getFamilyMemberLimit, getPlanTier, supportsFamilyMembers } from '~/lib/plan-tier'
import prisma from '~/lib/prisma'
import { isSubscriptionActive } from '~/routes/subscriptions/subscriptions.service'

type UserStatus = 'active' | 'inactive' | 'cancelled' | 'blocked'

type AdminUserRecord = User & {
  subscription: {
    status: SubscriptionStatus
    subscriptionPlan: {
      planName: string
    }
  } | null
  managedByOwner: Pick<User, 'id' | 'email' | 'name' | 'firstName' | 'lastName'> | null
  _count: {
    ownedFamilyMembers: number
    ownedPets: number
  }
}

function getDisplayName(user: Pick<User, 'name' | 'firstName' | 'lastName' | 'email'>): string {
  const name = decryptPhiNullable(user.name)
  if (name?.trim()) {
    return name.trim()
  }

  const parts = [decryptPhiNullable(user.firstName), decryptPhiNullable(user.lastName)].filter(
    (part): part is string => Boolean(part)
  )

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return user.email.split('@')[0] ?? user.email
}

function deriveStatus(user: User): UserStatus {
  if (user.isBlocked) {
    return 'blocked'
  }

  if (!user.emailVerified) {
    return 'inactive'
  }

  return 'active'
}

function buildFamilyMemberInfo(user: AdminUserRecord) {
  const isFamilyMemberAccount = Boolean(user.managedByOwnerId)
  const familyMemberCount = user._count.ownedFamilyMembers + user._count.ownedPets

  if (isFamilyMemberAccount && user.managedByOwner) {
    return {
      isFamilyMemberAccount: true,
      addedBy: {
        id: user.managedByOwner.id,
        name: getDisplayName(user.managedByOwner),
        email: user.managedByOwner.email,
      },
      familyMemberCount: 0,
      familyMemberLimit: 0,
      canAddFamilyMembers: false,
      familyMembersRemaining: 0,
    }
  }

  const planName = user.subscription?.subscriptionPlan?.planName ?? null
  const tier = getPlanTier(planName)
  const hasActiveSubscription = Boolean(
    user.subscription && isSubscriptionActive(user.subscription.status)
  )
  const familyMemberLimit = hasActiveSubscription ? getFamilyMemberLimit(tier) : 0
  const canAddFamilyMembers = hasActiveSubscription && supportsFamilyMembers(tier)
  const familyMembersRemaining = canAddFamilyMembers
    ? Math.max(0, familyMemberLimit - familyMemberCount)
    : 0

  return {
    isFamilyMemberAccount: false,
    addedBy: null,
    familyMemberCount,
    familyMemberLimit,
    canAddFamilyMembers,
    familyMembersRemaining,
  }
}

function toAdminUserResponse(user: AdminUserRecord) {
  const response = {
    id: user.id,
    name: getDisplayName(user),
    email: user.email,
    firstName: decryptPhiNullable(user.firstName),
    lastName: decryptPhiNullable(user.lastName),
    phone: decryptPhiNullable(user.phone),
    address: decryptPhiNullable(user.address),
    bloodGroup: decryptPhiNullable(user.bloodGroup),
    gender: decryptPhiNullable(user.gender),
    profileImage: user.profileImage,
    plan: null as string | null,
    status: deriveStatus(user),
    isBlocked: user.isBlocked,
    emailVerified: user.emailVerified,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    ...buildFamilyMemberInfo(user),
  }

  if (user.isBlocked) {
    return {
      ...response,
      status: 'blocked' as const,
    }
  }

  if (
    user.subscription &&
    (user.subscription.status === 'active' || user.subscription.status === 'trialing')
  ) {
    return {
      ...response,
      plan: user.subscription.subscriptionPlan.planName,
      status: 'active' as const,
    }
  }

  if (user.subscription?.status === 'cancelled') {
    return {
      ...response,
      status: 'cancelled' as const,
    }
  }

  return response
}

async function getPatientUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Only patient accounts can be blocked.', 400)
  }

  return user
}

async function getAdminUserRecord(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: { subscriptionPlan: true },
      },
      managedByOwner: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: { ownedFamilyMembers: true, ownedPets: true },
      },
    },
  })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  return user
}

export async function listAdminUsers(actorUserId?: string) {
  const users = await prisma.user.findMany({
    where: { role: USER_ROLES.USER },
    include: {
      subscription: {
        include: { subscriptionPlan: true },
      },
      managedByOwner: {
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: { ownedFamilyMembers: true, ownedPets: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId,
    resourceType: 'PatientProfile',
    metadata: { scope: 'admin-user-list', recordCount: users.length },
  })

  return users.map(user => toAdminUserResponse(user))
}

export async function blockUser(userId: string, actorUserId?: string) {
  const user = await getPatientUserOrThrow(userId)

  if (user.isBlocked) {
    throw new HttpError('User is already blocked.', 400)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isBlocked: true,
      tokenVersion: { increment: 1 },
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.ADMIN_USER_BLOCK,
    actorUserId,
    patientUserId: userId,
    resourceType: 'User',
    resourceId: userId,
  })

  return toAdminUserResponse(await getAdminUserRecord(updated.id))
}

export async function unblockUser(userId: string, actorUserId?: string) {
  const user = await getPatientUserOrThrow(userId)

  if (!user.isBlocked) {
    throw new HttpError('User is not blocked.', 400)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isBlocked: false },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.ADMIN_USER_UNBLOCK,
    actorUserId,
    patientUserId: userId,
    resourceType: 'User',
    resourceId: userId,
  })

  return toAdminUserResponse(await getAdminUserRecord(updated.id))
}

export async function assertUserNotBlocked(userId: string, tokenVersion?: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBlocked: true, role: true, tokenVersion: true },
  })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.isBlocked) {
    throw new HttpError('Your account has been blocked. Please contact support.', 403)
  }

  const sessionTokenVersion = tokenVersion ?? 0

  if (user.tokenVersion !== sessionTokenVersion) {
    throw new HttpError('Your session has expired. Please sign in again.', 401)
  }
}
