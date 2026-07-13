import { getFamilyMemberLimit, getPlanTier, supportsFamilyMembers } from '~/lib/plan-tier'
import prisma from '~/lib/prisma'
import { isSubscriptionActive } from '~/routes/subscriptions/subscriptions.service'

export async function countHouseholdSeats(ownerId: string) {
  const [memberCount, petCount] = await Promise.all([
    prisma.familyMember.count({ where: { ownerId } }),
    prisma.pet.count({ where: { ownerId } }),
  ])

  return {
    memberCount,
    petCount,
    usedSeats: memberCount + petCount,
  }
}

export async function getHouseholdSeatLimitForOwner(ownerId: string) {
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

  if (!owner?.subscription || !isSubscriptionActive(owner.subscription.status)) {
    return 0
  }

  const tier = getPlanTier(owner.subscription.subscriptionPlan.planName)

  if (!supportsFamilyMembers(tier)) {
    return 0
  }

  return getFamilyMemberLimit(tier)
}
