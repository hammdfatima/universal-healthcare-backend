# HIPAA Controls Reference

This document maps HIPAA Security Rule (45 CFR §164.308/.310/.312) and
Privacy Rule (45 CFR §164.520, Notice of Privacy Practices) requirements
to the concrete technical controls implemented in this codebase. It is a
living reference for engineers, not a substitute for a formal risk
assessment or legal review.

## 1. Access control (45 CFR §164.312(a))

| Requirement | Control | Where |
|---|---|---|
| Unique user identification | Every user has a unique account (`User.id`, `User.email`), role (`USER`/`ADMIN`), and session. | `prisma/schema.prisma` (`User`, `Role`) |
| Emergency access procedure | Break-glass "emergency access" flow, fully audited. | `EmergencyAccessToken` model; `routes/emergency-access`; `AUDIT_ACTIONS.EMERGENCY_UNLOCK` / `EMERGENCY_UNLOCK_FAILED` |
| Automatic logoff | Idle session is force-ended after 15 minutes of inactivity, with a warning at 13 minutes. | `lib/auth/constants.ts` (`INACTIVITY_TIMEOUT_MS`, `INACTIVITY_WARNING_MS`), `lib/auth/activity.ts`, `provider/auth-provider.tsx`, `components/auth/inactivity-warning-modal.tsx` |
| Encryption/decryption of ePHI | Field-level AES-256-GCM envelope encryption for sensitive clinical columns. | `src/lib/phi-crypto.ts`; see `PHI_DATA_DICTIONARY.md` for field coverage |

## 2. Person/entity authentication (45 CFR §164.312(d))

| Requirement | Control | Where |
|---|---|---|
| Strong passwords | Minimum 10 characters, mixed case, number, symbol, and rejection of known-breached passwords. | `lib/auth/password.ts` (`strongPasswordSchema`, `isStrongPassword`, `isCommonBreachedPassword`); enforced in admin password-change UI (`app/(dashboards)/admin/settings/_components/change-password-tab.tsx`) and signup |
| Multi-factor authentication | TOTP-based MFA; new patient accounts are required to enroll. | `lib/mfa.ts` (backend); `AuthUser.mfaSetupRequired` (frontend), `app/(dashboards)/patient/_components/mfa-setup-guard.tsx`, redirect-after-login in `lib/auth/session.ts` (`getPostAuthRedirect`) |
| §2.4 Step-up (re-)authentication for sensitive operations | Before exporting all patient data or deleting an account, the user must re-enter their password to obtain a short-lived `stepUpToken`, which the backend validates before performing the operation. | `components/auth/step-up-password-dialog.tsx`, `POST /auth/step-up/verify`, `AUDIT_ACTIONS.STEP_UP_SUCCESS`/`STEP_UP_FAILURE`, `app/(dashboards)/patient/settings/_components/account-tab.tsx`, `app/(dashboards)/patient/_lib/download-patient-data.ts` |
| §2.5 MFA enrollment enforcement | Patients with `mfaSetupRequired: true` are redirected to the security settings tab after login and are blocked (via a persistent gate/banner) from using the rest of the dashboard until MFA is enabled, except the settings pages needed to complete enrollment. | `app/(dashboards)/patient/_components/mfa-setup-guard.tsx`, `app/(dashboards)/patient/layout.tsx` |
| Account lockout | Failed login attempts are tracked and accounts are temporarily locked. | `User.failedLoginAttempts`, `User.lockedUntil`; `AUDIT_ACTIONS.LOGIN_LOCKED` |

## 3. Audit controls (45 CFR §164.312(b))

| Requirement | Control | Where |
|---|---|---|
| Record PHI access/modification | Every PHI read/create/update/delete, login, MFA event, password change, consent capture, session revocation, step-up attempt, and admin/breach action is written to an append-only audit log with actor, role, resource, patient, IP, and user agent. | `src/lib/audit.ts` (`writeAuditLog`, `AUDIT_ACTIONS`), `src/lib/request-context.ts` |
| Admin visibility into audit trail | Dedicated admin route to review audit logs. | `routes/admin-audit-logs` |
| Breach tracking | Admins can record and track breach incidents, which are themselves audited. | `routes/admin-breach-incidents`; `AUDIT_ACTIONS.BREACH_INCIDENT_*` |

## 4. Session management & device/session visibility (45 CFR §164.312(a)(2)(iii))

| Requirement | Control | Where |
|---|---|---|
| User can see active sessions | "Active sessions" list (device/UA, IP, last-seen, current flag) in patient settings. | `GET /settings/sessions`; `AuthSession` model; account tab sessions UI |
| User can revoke a session | Revoke a single session by ID. | `DELETE /settings/sessions/:sessionId`; `revokeAuthSession` (`lib/api/patient-settings.ts`); `AUDIT_ACTIONS.SESSION_REVOKED` |
| User can log out other devices | "Log out all other devices" action. | `revokeOtherAuthSessions` (`lib/api/patient-settings.ts`), iterating non-current sessions; `AUDIT_ACTIONS.SESSIONS_REVOKED_ALL` |

## 5. Transmission security (45 CFR §164.312(e))

| Requirement | Control | Where |
|---|---|---|
| Encryption in transit | HSTS forces HTTPS for a full year including subdomains. | `next.config.ts` (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) |
| Prevent protocol downgrade | CSP `upgrade-insecure-requests` directive. | `next.config.ts` |
| Same-origin session cookie | Browser never talks to the backend origin directly; a same-origin BFF proxy (`/api/v1`) relays requests and normalizes the session cookie to first-party/`SameSite=Lax`. | `app/api/v1/[...path]/route.ts`, `lib/api-base.ts` |

## 6. Application/browser security hardening

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS, prevent SSL-stripping. |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing attacks. |
| `X-Frame-Options` | `DENY` | Prevent clickjacking via framing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Avoid leaking full URLs (which may contain tokens) to third-party origins. |
| `Permissions-Policy` | `camera=() microphone=() geolocation=()` | Deny access to sensitive device APIs the app doesn't use. |
| `Content-Security-Policy` | `frame-ancestors 'none'; upgrade-insecure-requests; ...` | Defense-in-depth against XSS/clickjacking; `frame-ancestors 'none'` is a modern, CSP-level reinforcement of `X-Frame-Options`. |

All headers are set centrally in `next.config.ts` so they apply to every
response without per-route boilerplate.

## 7. Privacy Rule — Notice of Privacy Practices (45 CFR §164.520)

| Requirement | Control | Where |
|---|---|---|
| NPP must be made available | Dedicated Notice of Privacy Practices page describing patient-controlled records, encryption, access controls, emergency access, and contact information. | `app/(public)/notice-of-privacy-practices/page.tsx` |
| NPP must be discoverable | Linked from the site footer and from the Privacy Policy page. | `app/_components/footer.tsx`, `app/(public)/privacy-policy/page.tsx` |
| Acknowledgment captured at signup | Signup requires explicit checkboxes for Terms, Privacy Policy, Emergency Access consent, and acknowledgment of the NPP; consents are recorded server-side. | `app/(auth)/_components/signup-form.tsx`; `ConsentRecord` model; `AUDIT_ACTIONS.CONSENT_RECORDED` |

## 8. Data minimization & retention

| Requirement | Control | Where |
|---|---|---|
| Retention policy enforcement | Configurable retention rules with an admin-facing management UI/API and a job that applies them. | `RetentionRule` model; `routes/admin-retention`; `AUDIT_ACTIONS.RETENTION_JOB_RUN` |
| Field-level encryption of ePHI | See `PHI_DATA_DICTIONARY.md` for the current field-by-field inventory and encryption coverage. | `src/lib/phi-crypto.ts` |

## 9. Workforce / engineering process controls

| Requirement | Control | Where |
|---|---|---|
| Continuous verification of code quality/security-relevant checks | CI runs dependency install, lint (Biome), and type-checking on every push/PR for both frontend and backend; backend CI also regenerates the Prisma client so type errors in encrypted-field usage are caught. | `universal-healthcare-frontend/.github/workflows/ci.yml`, `universal-healthcare-backend/.github/workflows/ci.yml` |
| Regression tests for password policy | Unit tests cover `isStrongPassword`, `isCommonBreachedPassword`, and `strongPasswordSchema`. | `universal-healthcare-frontend/lib/auth/password.test.ts` (`bun test`) |

## 10. Known gaps / follow-ups

Field-level AES-256-GCM encryption now covers clinical strings **and**
clinical dates (stored as encrypted ISO text), care-network records,
pets, lifestyle history, notifications, and support-query bodies. See
`PHI_DATA_DICTIONARY.md`.

Remaining follow-ups outside app-layer encryption:

- Formal Business Associate Agreements (BAAs) with any third-party
  infrastructure providers (hosting, object storage, email) — a
  contractual/legal control outside this codebase's scope.
- A dedicated `revoke-others` backend endpoint (the frontend currently
  achieves "log out all other devices" by revoking each non-current
  session individually — functionally equivalent, but a single
  server-side transaction would be more efficient and atomic).
- A periodic access review process for `ADMIN` role assignment.
- Object-storage provider controls (e.g. Cloudinary SSE/KMS) confirmed
  under a signed BAA.
