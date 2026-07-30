/**
 * When `ENABLE_MFA` is not `"true"`, MFA enrollment and login challenges are disabled.
 * Set `ENABLE_MFA=true` in production.
 */
export function isMfaEnabled() {
  return Bun.env.ENABLE_MFA === 'true'
}
