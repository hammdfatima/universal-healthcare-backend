import {
  getCoveredMemberUserIds,
  getOwnerPlanCapabilities,
} from '~/lib/household-access'
import { getFamilyMemberLimit } from '~/lib/plan-tier'
import prisma from '~/lib/prisma'

/**
 * Seat usage for family-member create limits: accessible humans only.
 * Pets are managed separately and do not consume family plan seats.
 */
export async function countHouseholdSeats(ownerId: string) {
  const [capabilities, covered, totalMembers, petCount] = await Promise.all([
    getOwnerPlanCapabilities(ownerId),
    getCoveredMemberUserIds(ownerId),
    prisma.familyMember.count({ where: { ownerId } }),
    prisma.pet.count({ where: { ownerId } }),
  ])

  const accessibleMemberCount = covered.size

  return {
    memberCount: totalMembers,
    accessibleMemberCount,
    petCount,
    accessiblePetCount: petCount,
    pausedPetCount: 0,
    usedSeats: accessibleMemberCount,
  }
}

export async function getHouseholdSeatLimitForOwner(ownerId: string) {
  const capabilities = await getOwnerPlanCapabilities(ownerId)
  return getFamilyMemberLimit(capabilities)
}
