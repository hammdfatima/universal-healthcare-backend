type RateLimitEntry = {
  count: number
  resetAt: number
}

const attempts = new Map<string, RateLimitEntry>()
const ipAttempts = new Map<string, RateLimitEntry>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const IP_WINDOW_MS = 15 * 60 * 1000
const IP_MAX_ATTEMPTS = 30

function pruneExpired(map: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of map) {
    if (entry.resetAt <= now) {
      map.delete(key)
    }
  }
}

function checkLimit(
  map: Map<string, RateLimitEntry>,
  key: string,
  maxAttempts: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  pruneExpired(map, now)

  const entry = map.get(key)
  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.resetAt <= now) {
    map.delete(key)
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

function recordFailure(
  map: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number
) {
  const now = Date.now()
  const existing = map.get(key)

  if (!existing || existing.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  existing.count += 1
  map.set(key, existing)
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean
  retryAfterSeconds: number
} {
  return checkLimit(attempts, key, MAX_ATTEMPTS)
}

export function checkIpLoginRateLimit(ip?: string | null): {
  allowed: boolean
  retryAfterSeconds: number
} {
  const key = (ip || 'unknown').trim()
  return checkLimit(ipAttempts, key, IP_MAX_ATTEMPTS)
}

export function recordLoginFailure(key: string) {
  recordFailure(attempts, key, WINDOW_MS)
}

export function recordIpLoginFailure(ip?: string | null) {
  recordFailure(ipAttempts, (ip || 'unknown').trim(), IP_WINDOW_MS)
}

export function clearLoginFailures(key: string) {
  attempts.delete(key)
}

export function buildLoginRateLimitKey(email: string, ip?: string | null) {
  return `${(ip || 'unknown').trim()}|${email.toLowerCase().trim()}`
}
