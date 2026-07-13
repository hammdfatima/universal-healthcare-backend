import type { User } from '~/generated/prisma'
import { HttpError } from '~/lib/error'
import { hashPassword, verifyPassword } from '~/lib/password'
import {
  decryptPhiNullable,
  encryptPhiNullable,
  encryptPhiRequired,
} from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'

type AdminProfileInput = {
  name: string
  email: string
  phone: string
}

function getDisplayName(user: User): string {
  const name = decryptPhiNullable(user.name)?.trim()
  if (name) {
    return name
  }

  const parts = [
    decryptPhiNullable(user.firstName),
    decryptPhiNullable(user.lastName),
  ].filter(Boolean)

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return user.email.split('@')[0] ?? user.email
}

function toAdminProfileResponse(user: User) {
  return {
    id: user.id,
    name: getDisplayName(user),
    email: user.email,
    phone: decryptPhiNullable(user.phone),
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export async function getAdminProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  return toAdminProfileResponse(user)
}

export async function updateAdminProfile(userId: string, input: AdminProfileInput) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })

  if (!existing) {
    throw new HttpError('User not found.', 404)
  }

  const normalizedEmail = input.email.toLowerCase().trim()
  const normalizedName = input.name.trim()
  const normalizedPhone = input.phone.trim()

  if (normalizedEmail !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (emailTaken && emailTaken.id !== userId) {
      throw new HttpError('This email is already in use.', 409)
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: encryptPhiRequired(normalizedName),
      email: normalizedEmail,
      phone: encryptPhiNullable(normalizedPhone),
      emailVerified:
        normalizedEmail === existing.email ? existing.emailVerified : false,
    },
  })

  return toAdminProfileResponse(user)
}

export async function changeAdminPassword(
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
