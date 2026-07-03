import { USER_ROLES } from '~/config/roles'
import type { User } from '~/generated/prisma'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'

type CompleteOnboardingInput = {
  firstName: string
  lastName: string
  phone: string
  profileImage?: string
  dateOfBirth: string
  bloodGroup: string
  gender: string
  address: string
}

function formatDateOfBirth(date: Date | null): string | null {
  if (!date) return null

  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

function toPatientProfileResponse(user: User) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage,
    dateOfBirth: formatDateOfBirth(user.dateOfBirth),
    bloodGroup: user.bloodGroup,
    gender: user.gender,
    address: user.address,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

function assertPatientUser(user: User | null) {
  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  return user
}

export async function getPatientProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return toPatientProfileResponse(assertPatientUser(user))
}

export async function completePatientOnboarding(
  userId: string,
  input: CompleteOnboardingInput
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  assertPatientUser(existing)

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...buildProfileUpdateData(input),
      onboardingCompleted: true,
    },
  })

  return toPatientProfileResponse(user)
}

function buildProfileUpdateData(input: CompleteOnboardingInput) {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()

  return {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    phone: input.phone.trim(),
    profileImage: input.profileImage?.trim() || null,
    gender: input.gender,
    dateOfBirth: new Date(input.dateOfBirth),
    bloodGroup: input.bloodGroup,
    address: input.address.trim(),
  }
}

export async function updatePatientProfileData(
  userId: string,
  input: CompleteOnboardingInput
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  assertPatientUser(existing)

  const user = await prisma.user.update({
    where: { id: userId },
    data: buildProfileUpdateData(input),
  })

  return toPatientProfileResponse(user)
}
