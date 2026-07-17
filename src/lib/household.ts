import {
  getCoveredMemberUserIds,
  getCoveredMemberUserIdsFromLinks,
  getOwnerPlanCapabilities,
} from '~/lib/household-access'
import { getFamilyMemberLimit } from '~/lib/plan-tier'
import { decryptPhiNullable } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'

export type HouseholdMember = {
  userId: string
  firstName: string
  lastName: string
  email: string
  relationship: string
  isAccountOwner: boolean
}

function displayParts(user: {
  firstName: string | null
  lastName: string | null
  email: string
}) {
  return {
    firstName: decryptPhiNullable(user.firstName) ?? '',
    lastName: decryptPhiNullable(user.lastName) ?? '',
    email: user.email,
  }
}

/**
 * FamilyMember.relationship is stored from the owner's POV
 * ("this member is my Child"). For the member viewing the owner, return the inverse.
 */
export function reciprocalRelationship(relationship: string): string {
  const normalized = relationship.trim().toLowerCase()

  switch (normalized) {
    case 'spouse':
      return 'Spouse'
    case 'child':
      return 'Parent'
    case 'parent':
      return 'Child'
    case 'sibling':
      return 'Sibling'
    default: {
      const trimmed = relationship.trim()
      return trimmed || 'Family'
    }
  }
}

/**
 * Returns other people in the same household (owner + covered family members),
 * excluding the requesting user. Soft-hidden members (plan seat exceeded) are omitted.
 */
export async function getHouseholdMembers(userId: string): Promise<HouseholdMember[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      managedByOwnerId: true,
    },
  })

  if (!user) {
    return []
  }

  const ownerId = user.managedByOwnerId ?? user.id
  // Fetch the plan and household records in one round trip group. This avoids
  // repeating the family-member query and keeps remote DB cold starts below
  // the HTTP connection timeout.
  const [capabilities, owner, links] = await Promise.all([
    getOwnerPlanCapabilities(ownerId),
    prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
    prisma.familyMember.findMany({
      where: { ownerId },
      include: {
        memberUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  const covered = getCoveredMemberUserIdsFromLinks(
    getFamilyMemberLimit(capabilities),
    links
  )

  // Managed members who lost coverage should not see household peers.
  if (user.managedByOwnerId && !covered.has(userId)) {
    return []
  }

  const members: HouseholdMember[] = []

  if (owner && owner.id !== userId) {
    const viewerLink = links.find(link => link.memberUserId === userId)
    const parts = displayParts(owner)
    members.push({
      userId: owner.id,
      firstName: parts.firstName,
      lastName: parts.lastName,
      email: parts.email,
      relationship: viewerLink
        ? reciprocalRelationship(viewerLink.relationship)
        : 'Family',
      isAccountOwner: true,
    })
  }

  for (const link of links) {
    if (link.memberUserId === userId) {
      continue
    }

    if (!covered.has(link.memberUserId)) {
      continue
    }

    const parts = displayParts(link.memberUser)
    members.push({
      userId: link.memberUserId,
      firstName: parts.firstName,
      lastName: parts.lastName,
      email: parts.email,
      relationship: link.relationship,
      isAccountOwner: false,
    })
  }

  return members
}

/**
 * People the current user may share medical records with.
 * Account owners: covered household members only.
 * Managed family members: only the account owner who added them.
 */
export async function getSharingRecipients(userId: string): Promise<HouseholdMember[]> {
  const household = await getHouseholdMembers(userId)
  const accountOwner = household.find(member => member.isAccountOwner)

  // Only managed accounts receive an account-owner row. Account owners receive
  // their covered members, all marked isAccountOwner=false.
  return accountOwner ? [accountOwner] : household
}

/**
 * People shown in the sidebar family list.
 * Same rules as sharing recipients for managed members (owner only).
 * Account owners see every covered family member.
 */
export async function getSidebarFamilyMembers(userId: string): Promise<HouseholdMember[]> {
  return getSharingRecipients(userId)
}

export async function areUsersInSameHousehold(userAId: string, userBId: string): Promise<boolean> {
  if (userAId === userBId) {
    return true
  }

  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userAId },
      select: { id: true, managedByOwnerId: true },
    }),
    prisma.user.findUnique({
      where: { id: userBId },
      select: { id: true, managedByOwnerId: true },
    }),
  ])

  if (!userA || !userB) {
    return false
  }

  const ownerA = userA.managedByOwnerId ?? userA.id
  const ownerB = userB.managedByOwnerId ?? userB.id

  if (ownerA !== ownerB) {
    return false
  }

  const covered = await getCoveredMemberUserIds(ownerA)

  // Owner is always in household; members must be covered.
  const aOk = !userA.managedByOwnerId || covered.has(userAId)
  const bOk = !userB.managedByOwnerId || covered.has(userBId)

  return aOk && bOk
}
