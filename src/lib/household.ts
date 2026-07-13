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
 * Returns other people in the same household (owner + linked family members),
 * excluding the requesting user. Works for both account owners and managed members.
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

  const [owner, links] = await Promise.all([
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

  const members: HouseholdMember[] = []

  if (owner && owner.id !== userId) {
    const parts = displayParts(owner)
    members.push({
      userId: owner.id,
      firstName: parts.firstName,
      lastName: parts.lastName,
      email: parts.email,
      relationship: 'Account Owner',
      isAccountOwner: true,
    })
  }

  for (const link of links) {
    if (link.memberUserId === userId) {
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
 * Account owners: all household members.
 * Managed family members: only the account owner who added them.
 */
export async function getSharingRecipients(userId: string): Promise<HouseholdMember[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, managedByOwnerId: true },
  })

  if (!user) {
    return []
  }

  const household = await getHouseholdMembers(userId)

  if (user.managedByOwnerId) {
    return household.filter(member => member.isAccountOwner)
  }

  return household
}

/**
 * People shown in the sidebar family list.
 * Same rules as sharing recipients for managed members (owner only).
 * Account owners see every linked family member.
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

  return ownerA === ownerB
}
