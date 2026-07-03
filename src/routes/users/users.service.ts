import type { User } from '~/generated/prisma'
import { USER_ROLES } from '~/config/roles'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'

type UserStatus = 'active' | 'inactive' | 'cancelled' | 'blocked'

function getDisplayName(user: User): string {
  if (user.name?.trim()) {
    return user.name.trim()
  }

  const parts = [user.firstName, user.lastName].filter(Boolean)

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

function toAdminUserResponse(user: User) {
  return {
    id: user.id,
    name: getDisplayName(user),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImage: user.profileImage,
    plan: null,
    status: deriveStatus(user),
    isBlocked: user.isBlocked,
    emailVerified: user.emailVerified,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
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

export async function listAdminUsers() {
  const users = await prisma.user.findMany({
    where: { role: USER_ROLES.USER },
    include: {
      subscription: {
        include: { subscriptionPlan: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return users.map(user => {
    const response = toAdminUserResponse(user)

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
  })
}

export async function blockUser(userId: string) {
  const user = await getPatientUserOrThrow(userId)

  if (user.isBlocked) {
    throw new HttpError('User is already blocked.', 400)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isBlocked: true },
  })

  return toAdminUserResponse(updated)
}

export async function unblockUser(userId: string) {
  const user = await getPatientUserOrThrow(userId)

  if (!user.isBlocked) {
    throw new HttpError('User is not blocked.', 400)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isBlocked: false },
  })

  return toAdminUserResponse(updated)
}

export async function assertUserNotBlocked(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBlocked: true, role: true },
  })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role === USER_ROLES.USER && user.isBlocked) {
    throw new HttpError(
      'Your account has been blocked. Please contact support.',
      403
    )
  }
}
