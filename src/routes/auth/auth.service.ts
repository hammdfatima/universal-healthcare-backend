import { USER_ROLES, type UserRole } from '~/config/roles'
import type { User } from '~/generated/prisma'
import { OtpPurpose } from '~/generated/prisma'
import { signAccessToken, signPasswordResetToken, verifyPasswordResetToken } from '~/lib/auth'
import { sendPasswordResetEmail, sendVerificationEmail } from '~/lib/email'
import { HttpError } from '~/lib/error'
import { generateOtpCode, getOtpExpiryDate } from '~/lib/otp'
import { hashPassword, verifyPassword } from '~/lib/password'
import prisma from '~/lib/prisma'
import type { IPayload } from '~/types'

const GENERIC_RESET_MESSAGE =
  'If an account exists for this email, a verification code has been sent.'

function toAuthUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    profileImage: user.profileImage,
    role: user.role as UserRole,
    emailVerified: user.emailVerified,
    mustChangePassword: user.mustChangePassword,
    isFamilyMemberAccount: Boolean(user.managedByOwnerId),
  }
}

function toTokenPayload(user: User): IPayload {
  return {
    user_id: user.id,
    email: user.email,
    role: user.role,
  }
}

async function issueAccessToken(user: User) {
  return {
    token: signAccessToken(toTokenPayload(user)),
    user: toAuthUser(user),
  }
}

async function createOtp(userId: string, purpose: OtpPurpose) {
  const code = generateOtpCode()

  await prisma.otp.updateMany({
    where: {
      userId,
      purpose,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  })

  await prisma.otp.create({
    data: {
      userId,
      code,
      purpose,
      expiresAt: getOtpExpiryDate(),
    },
  })

  return code
}

async function consumeValidOtp(email: string, otp: string, purpose: OtpPurpose) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return null
  }

  const record = await prisma.otp.findFirst({
    where: {
      userId: user.id,
      purpose,
      code: otp,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return null
  }

  await prisma.otp.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })

  return user
}

export async function signupUser(input: {
  firstName: string
  lastName: string
  email: string
  password: string
}) {
  const email = input.email.toLowerCase().trim()
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    throw new HttpError('An account with this email already exists.', 409)
  }

  const passwordHash = await hashPassword(input.password)
  const name = `${input.firstName.trim()} ${input.lastName.trim()}`.trim()

  const user = await prisma.user.create({
    data: {
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      name,
      password: passwordHash,
      role: USER_ROLES.USER,
    },
  })

  const code = await createOtp(user.id, OtpPurpose.EMAIL_VERIFICATION)
  await sendVerificationEmail(email, code)

  return user
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (!user || !(await verifyPassword(password, user.password))) {
    throw new HttpError('Invalid email or password.', 401)
  }

  if (user.isBlocked) {
    throw new HttpError(
      'Your account has been blocked. Please contact support.',
      403
    )
  }

  if (!user.emailVerified) {
    throw new HttpError('Please verify your email before logging in.', 403)
  }

  return issueAccessToken(user)
}

export async function verifyEmail(email: string, otp: string) {
  const user = await consumeValidOtp(email.toLowerCase().trim(), otp, OtpPurpose.EMAIL_VERIFICATION)

  if (!user) {
    throw new HttpError('Invalid or expired verification code.', 400)
  }

  if (user.isBlocked) {
    throw new HttpError(
      'Your account has been blocked. Please contact support.',
      403
    )
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  })

  return issueAccessToken(verifiedUser)
}

export async function resendVerification(email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (!user || user.emailVerified) {
    return
  }

  const code = await createOtp(user.id, OtpPurpose.EMAIL_VERIFICATION)
  await sendVerificationEmail(normalizedEmail, code)
}

export async function forgotPassword(email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (!user) {
    return
  }

  const code = await createOtp(user.id, OtpPurpose.PASSWORD_RESET)
  await sendPasswordResetEmail(normalizedEmail, code)
}

export async function verifyResetOtp(email: string, otp: string) {
  const user = await consumeValidOtp(email.toLowerCase().trim(), otp, OtpPurpose.PASSWORD_RESET)

  if (!user) {
    throw new HttpError('Invalid or expired verification code.', 400)
  }

  const resetRecord = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      expiresAt: getOtpExpiryDate(),
    },
  })

  return {
    resetToken: signPasswordResetToken(toTokenPayload(user), resetRecord.id),
  }
}

export async function resetPassword(token: string, password: string) {
  const payload = verifyPasswordResetToken(token)

  if (!payload) {
    throw new HttpError('Invalid or expired reset token.', 400)
  }

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { id: payload.jti },
  })

  if (
    !resetRecord ||
    resetRecord.userId !== payload.user_id ||
    resetRecord.usedAt ||
    resetRecord.expiresAt <= new Date()
  ) {
    throw new HttpError('Invalid or expired reset token.', 400)
  }

  const passwordHash = await hashPassword(password)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: payload.user_id },
      data: {
        password: passwordHash,
        mustChangePassword: false,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ])
}

export { GENERIC_RESET_MESSAGE }
