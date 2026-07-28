# ePHI Data Dictionary

This document inventories where electronic Protected Health Information
(ePHI) lives in Universal Health Charts, whether it is field-level
encrypted at rest, and who can access it. Source of truth for schema is
`universal-healthcare-backend/prisma/schema.prisma`; source of truth for
encryption is `universal-healthcare-backend/src/lib/phi-crypto.ts`.

Encryption legend:

- **AES-256-GCM (app-level)** — encrypted with `encryptPhi` /
  `encryptPhiRequired` / `encryptPhiNullable` / `encryptDateToPhi` /
  `encryptStringArray` before being persisted; the column stores an
  opaque `enc:v1:<iv>:<tag>:<ciphertext>` string, and is decrypted in the
  corresponding `*.service.ts` before it ever leaves the backend process.
- **At-rest (DB/disk) only** — protected by the database's disk/volume
  encryption and TLS-in-transit, but not additionally encrypted at the
  application layer. Typically login identifiers or technical metadata.
- **Not stored** — never persisted server-side (e.g. plaintext
  passwords, one-time step-up tokens).

> Backfill existing rows with:
> `bun run scripts/encrypt-existing-phi.ts`
> (safe to re-run; skips values already prefixed with `enc:v1:`).

## Identity & account (`User`)

| Field | Sensitivity | Encryption | Notes |
|---|---|---|---|
| `email` | PII | At-rest only | Login identifier; unique index. |
| `firstName`, `lastName`, `name` | PII | **AES-256-GCM** | |
| `phone`, `address` | PII | **AES-256-GCM** | |
| `gender`, `bloodGroup` | ePHI | **AES-256-GCM** | |
| `profileImage` | PII | At-rest only | URL/reference, not the binary. |
| `password` | Credential | Hashed | Never plaintext. |
| `mfaSecret` | Credential | **AES-256-GCM** via `encryptMfaSecret` | |
| `tokenVersion`, `failedLoginAttempts`, `lockedUntil` | Security metadata | N/A | |

## Clinical records

| Model | ePHI fields | Encryption | Notes |
|---|---|---|---|
| `Medication` | `medicineName`, `condition`, `prescribedBy`, `dosage`, `timesOfDay`, `startDate`, `endDate` | **AES-256-GCM** (dates stored as encrypted ISO strings) | Active-med filtering / dose scheduling decrypt in app. |
| `Allergy` | `allergyType`, `nature`, `symptoms`, `triggers` | **AES-256-GCM** | Arrays via `encryptStringArray`. |
| `HealthHistoryEntry` | `illnessName`, `diagnosisDate`, `prescribedBy`, `details` | **AES-256-GCM** | |
| `Vaccination` | `vaccineName`, `prescribedBy`, `administeredBy`, `dosage`, `vaccinationDate`, `time` | **AES-256-GCM** | |
| `LabResult` | `fileName`, `testType`, `testDate`, `fileUrl`, `filePublicId` | **AES-256-GCM** | File binary in Cloudinary; `fileMimeType` / `fileResourceType` remain metadata. |
| `ImagingResult` | `fileName`, `testType`, `scanType`, `scanDate`, `fileUrl`, `filePublicId` | **AES-256-GCM** | Same pattern as lab results. |
| `FamilyLifestyleHistory` | `substancesData`, `familyHistoryData` | **AES-256-GCM** | JSON blobs encrypted as strings. |

## Care network & sharing

| Model | Data | Encryption | Notes |
|---|---|---|---|
| `CareProvider` | `name`, `phone`, `email`, `clinicDetails` | **AES-256-GCM** | |
| `Pharmacy` | `name`, `phone`, `address`, `notes` | **AES-256-GCM** | |
| `MedicalRecordShare` | Grantor/grantee relationship, scope | At-rest only | Access-control record, not clinical content. |
| `Pet` | Profile, contact, notes, JSON clinical blobs, `dateOfBirth` | **AES-256-GCM** | |
| `PetShare`, `PetEmergencyAccessToken` | Linkage / token state | At-rest only | Access metadata; vault content decrypted via pet mappers. |

## Authentication, sessions & consent

| Model | Data | Encryption | Notes |
|---|---|---|---|
| `AuthSession` | Device/UA, IP, last-seen | At-rest only | Security metadata, not clinical ePHI. |
| `Otp`, `PasswordResetToken` | One-time codes/tokens | At-rest only, short TTL | |
| `ConsentRecord` | Consent type + timestamp | At-rest only | |
| `EmergencyAccessToken` | Break-glass token/state | At-rest only | Uses audited; unlock responses decrypt clinical fields. |
| Step-up token (`stepUpToken`) | Short-lived re-auth proof | **Not stored** | |

## Administrative / messaging

| Model | Data | Encryption | Notes |
|---|---|---|---|
| `AuditLog` | Action, actor, resource IDs, IP/UA, metadata | At-rest only | Do not put raw ePHI values into `metadata`. |
| `BreachIncident` | Incident tracking fields | At-rest only | Workflow metadata. |
| `RetentionRule` | Policy configuration | N/A | |
| `Payment` / `UserSubscription` | Billing | At-rest only | Not clinical ePHI. |
| `UserQuery` | `fullName`, `message`, `reply` | **AES-256-GCM** | `email` / `subject` remain plaintext for routing/reply delivery. |
| `Notification` | `title`, `message` | **AES-256-GCM** | May contain medication/vaccine names. |

## Handling rules

1. **Minimum necessary:** decrypt/return only fields the route needs.
2. **No PHI in logs:** never put decrypted values in `console` or audit `metadata`.
3. **No PHI in URLs beyond IDs.**
4. **Export/delete require step-up** (see `HIPAA.md` §2.4).
5. **New clinical fields:** default to `encryptPhi*` / date / array helpers and update this table.
