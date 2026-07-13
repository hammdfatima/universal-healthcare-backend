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
  return (
    forwardedFor?.split(',')[0]?.trim() ||
    getHeader('x-real-ip') ||
    getHeader('cf-connecting-ip') ||
    null
  )
}
