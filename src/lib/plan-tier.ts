export type PlanTier = 'individual' | 'couple' | 'family'

export function getPlanTier(planName?: string | null): PlanTier | null {
  if (!planName) {
    return null
  }

  const normalized = planName.toLowerCase()

  if (normalized.includes('family')) {
    return 'family'
  }

  if (normalized.includes('couple')) {
    return 'couple'
  }

  if (normalized.includes('individual')) {
    return 'individual'
  }

  return null
}

export function supportsFamilyMembers(tier: PlanTier | null): boolean {
  return tier === 'couple' || tier === 'family'
}

export function getFamilyMemberLimit(tier: PlanTier | null): number {
  if (tier === 'couple') {
    return 1
  }

  if (tier === 'family') {
    return 6
  }

  return 0
}
