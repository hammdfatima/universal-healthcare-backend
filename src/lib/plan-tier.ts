export type PlanKind = 'human' | 'pet'

export type PlanCapabilities = {
  planKind: PlanKind
  memberLimit: number
  petLimit: number
  allowsPets: boolean
}

/** UI copy helper — Couple-style when exactly one seat; Family-style when more. */
export type PlanTier = 'individual' | 'couple' | 'family'

export function getPlanTierFromCapabilities(
  capabilities: PlanCapabilities | null | undefined
): PlanTier | null {
  if (!capabilities) {
    return null
  }

  if (capabilities.planKind === 'pet' || capabilities.memberLimit <= 0) {
    return 'individual'
  }

  if (capabilities.memberLimit === 1) {
    return 'couple'
  }

  return 'family'
}

/** @deprecated Prefer getPlanTierFromCapabilities / plan.memberLimit from API. */
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

export function supportsFamilyMembers(capabilities: PlanCapabilities | null | undefined): boolean {
  return Boolean(capabilities && capabilities.planKind === 'human' && capabilities.memberLimit > 0)
}

/**
 * Human UHC memberships include pets at no extra charge.
 * Pet-only plans include pets up to `petLimit`.
 */
export function supportsPets(capabilities: PlanCapabilities | null | undefined): boolean {
  if (!capabilities) {
    return false
  }

  if (capabilities.planKind === 'human') {
    return true
  }

  if (capabilities.planKind === 'pet') {
    return capabilities.petLimit > 0
  }

  return Boolean(capabilities.allowsPets)
}

/** Unlimited for human plans; otherwise the explicit pet seat cap. */
export function getPetLimit(capabilities: PlanCapabilities | null | undefined): number {
  if (!capabilities || !supportsPets(capabilities)) {
    return 0
  }

  if (capabilities.planKind === 'human') {
    return Number.POSITIVE_INFINITY
  }

  return Math.max(0, capabilities.petLimit)
}

export function getFamilyMemberLimit(capabilities: PlanCapabilities | null | undefined): number {
  if (!capabilities || capabilities.planKind === 'pet') {
    return 0
  }

  return capabilities.memberLimit ?? 0
}

export function toPlanCapabilities(plan: {
  planKind?: PlanKind | null
  memberLimit: number
  petLimit?: number | null
  allowsPets: boolean
}): PlanCapabilities {
  return {
    planKind: plan.planKind ?? 'human',
    memberLimit: plan.memberLimit,
    petLimit: plan.petLimit ?? 0,
    allowsPets: plan.allowsPets,
  }
}
