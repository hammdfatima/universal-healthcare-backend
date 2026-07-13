type RateLimitEntry = {
  count: number
  resetAt: number
}

const attempts = new Map<string, RateLimitEntry>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

function pruneExpired(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) {
      attempts.delete(key)
    }
  }
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean
  retryAfterSeconds: number
} {
  const now = Date.now()
  pruneExpired(now)

  const entry = attempts.get(key)
  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.resetAt <= now) {
    attempts.delete(key)
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

export function recordLoginFailure(key: string) {
  const now = Date.now()
  const existing = attempts.get(key)

  if (!existing || existing.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  existing.count += 1
  attempts.set(key, existing)
}

export function clearLoginFailures(key: string) {
  attempts.delete(key)
}

export function buildLoginRateLimitKey(email: string, ip?: string | null) {
  return `${(ip || 'unknown').trim()}|${email.toLowerCase().trim()}`
}
