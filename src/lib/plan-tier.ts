export type PlanCapabilities = {
  memberLimit: number
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

  if (capabilities.memberLimit <= 0) {
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
  return Boolean(capabilities && capabilities.memberLimit > 0)
}

export function supportsPets(capabilities: PlanCapabilities | null | undefined): boolean {
  return Boolean(capabilities?.allowsPets)
}

export function getFamilyMemberLimit(capabilities: PlanCapabilities | null | undefined): number {
  return capabilities?.memberLimit ?? 0
}
