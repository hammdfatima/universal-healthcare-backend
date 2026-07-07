import { USER_ROLES } from '~/config/roles'
import type { CareProvider } from '~/generated/prisma'
import { HttpError } from '~/lib/error'
import {
  notifyCareProviderAdded,
  notifyCareProviderRemoved,
  notifyCareProviderUpdated,
} from '~/lib/notifications'
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
    name: record.name,
    phone: record.phone,
    email: record.email,
    clinicDetails: record.clinicDetails,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function assertPatientUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  return user
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

  return {
    providers: providers.map(toCareProviderResponse),
  }
}

export async function createCareProvider(userId: string, input: CareProviderInput) {
  await assertPatientUser(userId)

  const record = await prisma.careProvider.create({
    data: {
      userId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: normalizeOptionalText(input.email),
      clinicDetails: normalizeOptionalText(input.clinicDetails),
    },
  })

  await notifyCareProviderAdded(userId, record)

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
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: normalizeOptionalText(input.email),
      clinicDetails: normalizeOptionalText(input.clinicDetails),
    },
  })

  await notifyCareProviderUpdated(userId, record)

  return toCareProviderResponse(record)
}

export async function deleteCareProvider(userId: string, careProviderId: string) {
  await assertPatientUser(userId)
  const existing = await getOwnedCareProvider(userId, careProviderId)

  await notifyCareProviderRemoved(userId, existing)

  await prisma.careProvider.delete({
    where: { id: careProviderId },
  })
}
