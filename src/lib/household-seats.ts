import {
  getCoveredMemberUserIds,
  getOwnerPlanCapabilities,
} from '~/lib/household-access'
import { getFamilyMemberLimit, supportsPets } from '~/lib/plan-tier'
import prisma from '~/lib/prisma'

/**
 * Seat usage for create limits: only accessible humans + pets (when allowed).
 * Soft-hidden members/pets do not consume seats.
 */
export async function countHouseholdSeats(ownerId: string) {
  const [capabilities, covered, totalMembers, petCount] = await Promise.all([
    getOwnerPlanCapabilities(ownerId),
    getCoveredMemberUserIds(ownerId),
    prisma.familyMember.count({ where: { ownerId } }),
    prisma.pet.count({ where: { ownerId } }),
  ])

  const accessibleMemberCount = covered.size
  const accessiblePetCount = supportsPets(capabilities) ? petCount : 0

  return {
    memberCount: totalMembers,
    accessibleMemberCount,
    petCount,
    accessiblePetCount,
    pausedPetCount: supportsPets(capabilities) ? 0 : petCount,
    usedSeats: accessibleMemberCount + accessiblePetCount,
  }
}

export async function getHouseholdSeatLimitForOwner(ownerId: string) {
  const capabilities = await getOwnerPlanCapabilities(ownerId)
  return getFamilyMemberLimit(capabilities)
}
