import { AsyncLocalStorage } from 'node:async_hooks'

export type RequestAuditContext = {
  ip?: string | null
  userAgent?: string | null
  actorUserId?: string | null
  actorRole?: string | null
}

const requestAuditStorage = new AsyncLocalStorage<RequestAuditContext>()

export function runWithRequestAuditContext<T>(
  context: RequestAuditContext,
  fn: () => T
) {
  return requestAuditStorage.run(context, fn)
}

export function getRequestAuditContext(): RequestAuditContext {
  return requestAuditStorage.getStore() ?? {}
}

export function setRequestAuditActor(actorUserId: string, actorRole: string) {
  const store = requestAuditStorage.getStore()
  if (!store) {
    return
  }

  store.actorUserId = actorUserId
  store.actorRole = actorRole
}

export function extractClientIp(
  getHeader: (name: string) => string | undefined
) {
  const forwardedFor = getHeader('x-forwarded-for')
  const raw =
    forwardedFor?.split(',')[0]?.trim() ||
    getHeader('x-real-ip') ||
    getHeader('cf-connecting-ip') ||
    getHeader('true-client-ip') ||
    getHeader('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    null

  return normalizeClientIp(raw)
}

/** Normalize loopback / IPv6-mapped forms so stored + displayed IPs are consistent. */
export function normalizeClientIp(ip: string | null | undefined): string | null {
  if (!ip) {
    return null
  }

  let value = ip.trim()
  if (!value) {
    return null
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.slice(1, -1)
  }

  const lower = value.toLowerCase()
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') {
    return '127.0.0.1'
  }

  if (lower.startsWith(':ffff:')) {
    return value.slice(value.toLowerCase().indexOf(':ffff:') + 6)
  }

  return value
}

/** Human-readable IP for emails and security alerts. */
export function formatClientIpForDisplay(ip: string | null | undefined): string {
  const normalized = normalizeClientIp(ip)
  if (!normalized) {
    return 'Unknown'
  }

  if (normalized === '127.0.0.1') {
    return 'This device (local network)'
  }

  return normalized
}

