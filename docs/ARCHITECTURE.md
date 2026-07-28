# Architecture Overview

Universal Health Charts is a two-application system: a Next.js frontend
("BFF" — backend-for-frontend) and a Hono/Bun backend API, backed by
PostgreSQL via Prisma. This document describes how the pieces fit together
and how ePHI (electronic Protected Health Information) moves through the
system.

```
┌────────────┐        HTTPS (first-party cookie)        ┌─────────────────────┐        HTTPS        ┌────────────┐
│  Browser   │ ───────────────────────────────────────► │ Next.js frontend     │ ───────────────────►│  Backend    │
│ (patient / │                                           │ app/api/v1/[...path] │                      │  API (Hono) │
│  admin)    │ ◄─────────────────────────────────────── │ proxy route (BFF)     │ ◄────────────────── │  + Prisma   │
└────────────┘                                           └─────────────────────┘                      └─────┬──────┘
                                                                                                              │
                                                                                                              ▼
                                                                                                     ┌──────────────────┐
                                                                                                     │ PostgreSQL         │
                                                                                                     │ (encrypted PHI     │
                                                                                                     │  columns)          │
                                                                                                     └──────────────────┘
```

## 1. Frontend (`universal-healthcare-frontend`)

- **Framework:** Next.js (App Router), React, TanStack Query, Zod, Tailwind.
- **Auth session:** the backend issues an httpOnly session cookie. The
  frontend keeps a small amount of *non-sensitive* session metadata
  (role, display flags such as `mfaSetupRequired`) in `localStorage` purely
  to drive UI (route guards, banners); the source of truth for
  authentication is always the httpOnly cookie validated by the backend.
- **BFF proxy route:** `app/api/v1/[...path]/route.ts` is a catch-all
  Next.js route handler that forwards every `/api/v1/*` request from the
  browser to the real backend (`BACKEND_API_URL` /
  `NEXT_PUBLIC_API_URL`). All browser code calls the **same-origin**
  `/api/v1` path (see `lib/api-base.ts`), never the backend origin
  directly. This exists so that:
  - The session cookie set by the backend can be rewritten as
    first-party/`SameSite=Lax` for the browser's origin, which keeps
    mobile browsers (Safari/Chrome on iOS in particular) from dropping the
    cookie on cross-site requests.
  - The backend origin is never exposed to client-side JavaScript or
    third parties in network logs.
  - Hop-by-hop headers are stripped and `Set-Cookie` headers from the
    upstream response are rewritten before being relayed back to the
    browser.
- **Route guards** (`AuthGuard`, `MustChangePasswordGuard`,
  `OnboardingGuard`, `SubscriptionGuard`, `MfaSetupGuard`) run at the
  dashboard layout level and progressively gate access: unauthenticated →
  must change password → onboarding → active subscription → MFA setup →
  full dashboard access.
- **Inactivity handling:** `lib/auth/activity.ts` tracks the last user
  interaction. `provider/auth-provider.tsx` polls this every 5s; at 13
  minutes idle it shows an "still there?" modal
  (`components/auth/inactivity-warning-modal.tsx`) with a "Stay signed in"
  action; at 15 minutes idle with no response the client-side session is
  cleared and the user is redirected to log in again (§ HIPAA.md 45 CFR
  §164.312(a)(2)(iii) automatic logoff).
- **Step-up authentication:** sensitive actions (data export, account
  deletion) require the user to re-enter their password
  (`components/auth/step-up-password-dialog.tsx`), which calls
  `POST /auth/step-up/verify` and receives a short-lived `stepUpToken`
  that is then attached to the sensitive request.

## 2. Backend (`universal-healthcare-backend`)

- **Framework:** Hono (OpenAPI-typed routes) running on Bun, Prisma ORM
  against PostgreSQL.
- **Routing:** every domain (auth, patient-profile, lab-results,
  medications, admin-*, etc.) is a self-contained route module under
  `src/routes/<domain>/` with `*.routes.ts` (schema + path definitions),
  `*.handler.ts` (request/response wiring), and `*.service.ts` (business
  logic + persistence). All routers are mounted under a common
  `API_START_POINT` prefix in `src/app.ts`.
- **Field-level encryption:** `src/lib/phi-crypto.ts` implements
  AES-256-GCM envelope encryption (`encryptPhi` / `decryptPhi` and
  nullable/array/date variants) for ePHI fields before they are written to
  Postgres, and decrypts on the way out. See `PHI_DATA_DICTIONARY.md` for
  exactly which fields are encrypted.
- **Audit logging:** `src/lib/audit.ts` (`writeAuditLog`) appends an
  `AuditLog` row for every PHI read/write, authentication event, consent,
  admin action, session revocation, step-up attempt, and breach-incident
  change. Audit context (actor, IP, user agent) is captured per-request
  via `src/lib/request-context.ts` so call sites don't have to thread it
  through manually.
- **Sessions:** `AuthSession` records track each active login (device/UA,
  IP, last-seen, current-session flag). The patient-settings routes expose
  list/revoke endpoints so a user can see and terminate sessions on other
  devices.
- **Step-up auth:** `POST /auth/step-up/verify` re-checks the user's
  password and issues a short-lived, single-purpose `stepUpToken` that
  export/delete-account endpoints require before performing irreversible
  or high-sensitivity operations.
- **Retention & breach management:** `admin-retention` and
  `admin-breach-incidents` routes give admins tooling to enforce data
  retention rules and to record/track breach incidents, both required by
  the HIPAA Security Rule / Breach Notification Rule.

## 3. Data flow for a typical PHI request

1. Browser calls `fetch("/api/v1/lab-results", { credentials: "include" })`.
2. Next.js BFF route reads the request, forwards it (with cookies/headers)
   to the backend's real origin, adding no logic beyond header hygiene and
   cookie rewriting.
3. Backend validates the session cookie, resolves the acting user,
   authorizes the request, and (for shared/family access) resolves the
   effective "vault" patient ID (`src/lib/vault-access.ts`).
4. The service layer decrypts stored ciphertext fields (`decryptPhi`)
   before returning data, and encrypts (`encryptPhi`) any ePHI before
   writing.
5. A `writeAuditLog` call records the read/write with actor, patient,
   resource, and metadata.
6. The response flows back through the BFF proxy, which relays it
   unmodified (aside from `Set-Cookie` normalization) to the browser.

## 4. Security headers

`next.config.ts` sets HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, and a baseline CSP
(`frame-ancestors 'none'`, `upgrade-insecure-requests`) on every response,
reducing the frontend's exposure to clickjacking, MIME-sniffing, and
protocol-downgrade attacks.

## 5. Related documents

- [`HIPAA.md`](./HIPAA.md) — how specific HIPAA Security/Privacy Rule
  requirements map to concrete controls in this codebase.
- [`PHI_DATA_DICTIONARY.md`](./PHI_DATA_DICTIONARY.md) — field-by-field
  inventory of ePHI, its storage location, and its encryption status.
