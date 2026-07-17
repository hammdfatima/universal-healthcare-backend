import type { User } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { decryptPhiNullable, encryptPhiRequired } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'

type CompleteOnboardingInput = {
  firstName: string
  lastName: string
  phone: string
  profileImage?: string
  bloodGroup: string
  gender: string
  address: string
}

function toPatientProfileResponse(user: User) {
  return {
    id: user.id,
    firstName: decryptPhiNullable(user.firstName),
    lastName: decryptPhiNullable(user.lastName),
    email: user.email,
    phone: decryptPhiNullable(user.phone),
    profileImage: user.profileImage,
    bloodGroup: decryptPhiNullable(user.bloodGroup),
    gender: decryptPhiNullable(user.gender),
    address: decryptPhiNullable(user.address),
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export async function getPatientProfile(userId: string) {
  await assertPatientUser(userId)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HttpError('User not found.', 404)
  }
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'PatientProfile',
    resourceId: userId,
  })
  return toPatientProfileResponse(user)
}

export async function completePatientOnboarding(userId: string, input: CompleteOnboardingInput) {
  await assertPatientUser(userId)

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...buildProfileUpdateData(input),
      onboardingCompleted: true,
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_CREATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'PatientProfile',
    resourceId: userId,
  })

  return toPatientProfileResponse(user)
}

function buildProfileUpdateData(input: CompleteOnboardingInput) {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()

  return {
    firstName: encryptPhiRequired(firstName),
    lastName: encryptPhiRequired(lastName),
    name: encryptPhiRequired(`${firstName} ${lastName}`.trim()),
    phone: encryptPhiRequired(input.phone.trim()),
    profileImage: input.profileImage?.trim() || null,
    gender: encryptPhiRequired(input.gender.trim()),
    bloodGroup: encryptPhiRequired(input.bloodGroup.trim()),
    address: encryptPhiRequired(input.address.trim()),
  }
}

export async function updatePatientProfileData(userId: string, input: CompleteOnboardingInput) {
  await assertPatientUser(userId)

  const user = await prisma.user.update({
    where: { id: userId },
    data: buildProfileUpdateData(input),
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'PatientProfile',
    resourceId: userId,
  })

  return toPatientProfileResponse(user)
}
