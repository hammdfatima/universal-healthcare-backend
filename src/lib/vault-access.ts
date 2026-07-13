import { assertPatientUser } from '~/lib/assert-patient'
import { HttpError } from '~/lib/error'
import { areUsersInSameHousehold } from '~/lib/household'
import prisma from '~/lib/prisma'

/**
 * Resolves which patient's medical vault the actor may read.
 * Own vault always allowed. Another vault requires an active share grant.
 */
export async function resolveVaultPatientId(
  actorUserId: string,
  requestedPatientUserId?: string | null
): Promise<string> {
  await assertPatientUser(actorUserId)

  const patientUserId = requestedPatientUserId?.trim() || actorUserId

  if (patientUserId === actorUserId) {
    return actorUserId
  }

  await assertPatientUser(patientUserId)

  const sameHousehold = await areUsersInSameHousehold(actorUserId, patientUserId)

  if (!sameHousehold) {
    throw new HttpError('You can only view medical records shared within your family.', 403)
  }

  const owner = await prisma.user.findUnique({
    where: { id: patientUserId },
    select: { medicalRecordShareWithAll: true },
  })

  if (!owner) {
    throw new HttpError('Patient not found.', 404)
  }

  if (owner.medicalRecordShareWithAll) {
    return patientUserId
  }

  const share = await prisma.medicalRecordShare.findUnique({
    where: {
      ownerUserId_granteeUserId: {
        ownerUserId: patientUserId,
        granteeUserId: actorUserId,
      },
    },
  })

  if (!share) {
    throw new HttpError('This family member has not shared their medical records with you.', 403)
  }

  return patientUserId
}

export async function assertCanViewVault(
  actorUserId: string,
  patientUserId: string
): Promise<void> {
  await resolveVaultPatientId(actorUserId, patientUserId)
}
