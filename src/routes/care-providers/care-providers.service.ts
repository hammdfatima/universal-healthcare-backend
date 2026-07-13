import type { CareProvider } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import {
  notifyCareProviderAdded,
  notifyCareProviderRemoved,
  notifyCareProviderUpdated,
} from '~/lib/notifications'
import {
  decryptPhi,
  decryptPhiNullable,
  encryptPhiNullable,
  encryptPhiRequired,
} from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'

type CareProviderInput = {
  name: string
  phone: string
  email?: string
  clinicDetails?: string
}

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  return trimmed
}

function toCareProviderResponse(record: CareProvider) {
  return {
    id: record.id,
    name: decryptPhi(record.name),
    phone: decryptPhi(record.phone),
    email: decryptPhiNullable(record.email),
    clinicDetails: decryptPhiNullable(record.clinicDetails),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function getOwnedCareProvider(userId: string, careProviderId: string) {
  const record = await prisma.careProvider.findFirst({
    where: {
      id: careProviderId,
      userId,
    },
  })

  if (!record) {
    throw new HttpError('Care provider not found.', 404)
  }

  return record
}

export async function listCareProviders(userId: string) {
  await assertPatientUser(userId)

  const providers = await prisma.careProvider.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'CareProvider',
  })

  return {
    providers: providers.map(toCareProviderResponse),
  }
}

export async function createCareProvider(userId: string, input: CareProviderInput) {
  await assertPatientUser(userId)

  const record = await prisma.careProvider.create({
    data: {
      userId,
      name: encryptPhiRequired(input.name.trim()),
      phone: encryptPhiRequired(input.phone.trim()),
      email: encryptPhiNullable(normalizeOptionalText(input.email)),
      clinicDetails: encryptPhiNullable(normalizeOptionalText(input.clinicDetails)),
    },
  })

  await Promise.all([
    notifyCareProviderAdded(userId, toCareProviderResponse(record)),
    writeAuditLog({
      action: AUDIT_ACTIONS.PHI_CREATE,
      actorUserId: userId,
      patientUserId: userId,
      resourceType: 'CareProvider',
      resourceId: record.id,
    }),
  ])

  return toCareProviderResponse(record)
}

export async function updateCareProvider(
  userId: string,
  careProviderId: string,
  input: CareProviderInput
) {
  await assertPatientUser(userId)
  await getOwnedCareProvider(userId, careProviderId)

  const record = await prisma.careProvider.update({
    where: { id: careProviderId },
    data: {
      name: encryptPhiRequired(input.name.trim()),
      phone: encryptPhiRequired(input.phone.trim()),
      email: encryptPhiNullable(normalizeOptionalText(input.email)),
      clinicDetails: encryptPhiNullable(normalizeOptionalText(input.clinicDetails)),
    },
  })

  await Promise.all([
    notifyCareProviderUpdated(userId, toCareProviderResponse(record)),
    writeAuditLog({
      action: AUDIT_ACTIONS.PHI_UPDATE,
      actorUserId: userId,
      patientUserId: userId,
      resourceType: 'CareProvider',
      resourceId: record.id,
    }),
  ])

  return toCareProviderResponse(record)
}

export async function deleteCareProvider(userId: string, careProviderId: string) {
  await assertPatientUser(userId)
  const existing = await getOwnedCareProvider(userId, careProviderId)

  await notifyCareProviderRemoved(userId, toCareProviderResponse(existing))

  await prisma.careProvider.delete({
    where: { id: careProviderId },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'CareProvider',
    resourceId: careProviderId,
  })
}
