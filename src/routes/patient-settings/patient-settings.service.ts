import { HttpError } from '~/lib/error'
import { hashPassword, verifyPassword } from '~/lib/password'
import prisma from '~/lib/prisma'
import {
  getPatientProfile,
  updatePatientProfileData,
} from '~/routes/patient-profile/patient-profile.service'

type UpdateProfileInput = {
  firstName: string
  lastName: string
  phone: string
  profileImage?: string
  dateOfBirth: string
  bloodGroup: string
  gender: string
  address: string
}

type UpdateAccountInput = {
  emailNotifications: boolean
  marketingEmails: boolean
}

export async function getPatientSettings(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  const profile = await getPatientProfile(userId)

  return {
    profile,
    account: {
      emailNotifications: user.emailNotifications,
      marketingEmails: user.marketingEmails,
    },
  }
}

export async function updatePatientSettingsProfile(
  userId: string,
  input: UpdateProfileInput
) {
  const profile = await updatePatientProfileData(userId, input)

  return {
    profile,
    account: await getAccountSettings(userId),
  }
}

export async function updatePatientAccountSettings(
  userId: string,
  input: UpdateAccountInput
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailNotifications: input.emailNotifications,
      marketingEmails: input.marketingEmails,
    },
  })

  return {
    profile: await getPatientProfile(userId),
    account: {
      emailNotifications: user.emailNotifications,
      marketingEmails: user.marketingEmails,
    },
  }
}

async function getAccountSettings(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  return {
    emailNotifications: user.emailNotifications,
    marketingEmails: user.marketingEmails,
  }
}

export async function changePatientPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)

  if (!isCurrentPasswordValid) {
    throw new HttpError('Current password is incorrect.', 400)
  }

  if (currentPassword === newPassword) {
    throw new HttpError('New password must be different from your current password.', 400)
  }

  const passwordHash = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
  })
}
