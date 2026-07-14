import { HttpError } from '~/lib/error'
import type { PlanCapabilities } from '~/lib/plan-tier'
import { getFamilyMemberLimit } from '~/lib/plan-tier'
import prisma from '~/lib/prisma'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

function isActiveSubscriptionStatus(status: string | null | undefined) {
  return Boolean(status && ACTIVE_SUBSCRIPTION_STATUSES.has(status))
}

export const FAMILY_ACCESS_REVOKED_MESSAGE =
  'Your family member canceled or changed the subscription. Upgrade to get your account back.'

type MemberLink = {
  memberUserId: string
  relationship: string
  createdAt: Date
}

/**
 * Cover up to `memberLimit` humans: prefer Spouse first (oldest), then other
 * members oldest-first. Pets are gated separately via `allowsPets`.
 */
export function getCoveredMemberUserIdsFromLinks(
  memberLimit: number,
  links: MemberLink[]
): Set<string> {
  const covered = new Set<string>()

  if (memberLimit <= 0 || links.length === 0) {
    return covered
  }

  const spouses = links
    .filter(link => link.relationship.trim().toLowerCase() === 'spouse')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const others = links
    .filter(link => link.relationship.trim().toLowerCase() !== 'spouse')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const ordered = [...spouses, ...others]

  for (const link of ordered) {
    if (covered.size >= memberLimit) {
      break
    }
    covered.add(link.memberUserId)
  }

  return covered
}

export async function getOwnerPlanCapabilities(
  ownerId: string
): Promise<PlanCapabilities | null> {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      subscription: {
        select: {
          status: true,
          subscriptionPlan: {
            select: { memberLimit: true, allowsPets: true },
          },
        },
      },
    },
  })

  if (!owner?.subscription || !isActiveSubscriptionStatus(owner.subscription.status)) {
    return null
  }

  return {
    memberLimit: owner.subscription.subscriptionPlan.memberLimit,
    allowsPets: owner.subscription.subscriptionPlan.allowsPets,
  }
}

/** @deprecated Use getOwnerPlanCapabilities */
export async function getOwnerPlanTier(ownerId: string) {
  const capabilities = await getOwnerPlanCapabilities(ownerId)
  if (!capabilities) {
    return null
  }

  if (capabilities.memberLimit <= 0) {
    return 'individual' as const
  }
  if (capabilities.memberLimit === 1) {
    return 'couple' as const
  }
  return 'family' as const
}

export async function getCoveredMemberUserIds(ownerId: string): Promise<Set<string>> {
  const [capabilities, links] = await Promise.all([
    getOwnerPlanCapabilities(ownerId),
    prisma.familyMember.findMany({
      where: { ownerId },
      select: {
        memberUserId: true,
        relationship: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return getCoveredMemberUserIdsFromLinks(
    getFamilyMemberLimit(capabilities),
    links
  )
}

export async function isManagedMemberCovered(memberUserId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: memberUserId },
    select: { managedByOwnerId: true },
  })

  if (!user) {
    return false
  }

  if (!user.managedByOwnerId) {
    return true
  }

  const covered = await getCoveredMemberUserIds(user.managedByOwnerId)
  return covered.has(memberUserId)
}

export async function assertManagedMemberHasHouseholdAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { managedByOwnerId: true },
  })

  if (!user?.managedByOwnerId) {
    return
  }

  const covered = await getCoveredMemberUserIds(user.managedByOwnerId)

  if (!covered.has(userId)) {
    throw new HttpError(FAMILY_ACCESS_REVOKED_MESSAGE, 403)
  }
}

/**
 * After an owner's plan changes, invalidate sessions for members who lost coverage
 * and sync covered members' subscription snapshots to the owner's plan.
 */
export async function syncHouseholdAccessAfterPlanChange(ownerId: string) {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      managedByOwnerId: true,
      subscription: {
        select: {
          status: true,
          subscriptionPlanId: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          subscriptionPlan: {
            select: { memberLimit: true, allowsPets: true },
          },
        },
      },
    },
  })

  if (!owner || owner.managedByOwnerId) {
    return
  }

  const capabilities =
    owner.subscription && isActiveSubscriptionStatus(owner.subscription.status)
      ? {
          memberLimit: owner.subscription.subscriptionPlan.memberLimit,
          allowsPets: owner.subscription.subscriptionPlan.allowsPets,
        }
      : null

  const links = await prisma.familyMember.findMany({
    where: { ownerId },
    select: {
      memberUserId: true,
      relationship: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const covered = getCoveredMemberUserIdsFromLinks(
    getFamilyMemberLimit(capabilities),
    links
  )
  const uncoveredIds = links
    .map(link => link.memberUserId)
    .filter(id => !covered.has(id))

  if (uncoveredIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: uncoveredIds } },
      data: { tokenVersion: { increment: 1 } },
    })
  }

  if (owner.subscription && covered.size > 0) {
    await prisma.userSubscription.updateMany({
      where: { userId: { in: [...covered] } },
      data: {
        subscriptionPlanId: owner.subscription.subscriptionPlanId,
        status: owner.subscription.status,
        currentPeriodEnd: owner.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: owner.subscription.cancelAtPeriodEnd,
      },
    })
  }
}
