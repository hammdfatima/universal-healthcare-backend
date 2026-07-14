import { USER_ROLES, type UserRole } from '~/config/roles'
import type { User } from '~/generated/prisma'
import { OtpPurpose } from '~/generated/prisma'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import {
  signAccessToken,
  signMfaPendingToken,
  signPasswordResetToken,
  verifyMfaPendingToken,
  verifyPasswordResetToken,
} from '~/lib/auth'
import { sendPasswordResetEmail, sendSignInEmail, sendVerificationEmail } from '~/lib/email'
import { HttpError } from '~/lib/error'
import { assertManagedMemberHasHouseholdAccess } from '~/lib/household-access'
import {
  buildOtpAuthUrl,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  verifyTotpCode,
} from '~/lib/mfa'
import { notifySignIn } from '~/lib/notifications'
import { generateOtpCode, getOtpExpiryDate, hashOtpCode } from '~/lib/otp'
import { hashPassword, verifyPassword } from '~/lib/password'
import { decryptPhiNullable, encryptPhiRequired } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import {
  buildLoginRateLimitKey,
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
} from '~/lib/rate-limit'
import type { IPayload } from '~/types'

const GENERIC_RESET_MESSAGE =
  'If an account exists for this email, a verification code has been sent.'

type SignInContext = {
  ipAddress?: string | null
}

export type AuthUserResponse = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
  profileImage: string | null
  role: UserRole
  emailVerified: boolean
  mustChangePassword: boolean
  isFamilyMemberAccount: boolean
  mfaEnabled: boolean
}

export type SessionIssueResult = {
  mfaRequired: false
  token: string
  user: AuthUserResponse
}

export type MfaChallengeResult = {
  mfaRequired: true
  mfaToken: string
}

function toAuthUser(user: User): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: decryptPhiNullable(user.firstName),
    lastName: decryptPhiNullable(user.lastName),
    name: decryptPhiNullable(user.name),
    profileImage: user.profileImage,
    role: user.role as UserRole,
    emailVerified: user.emailVerified,
    mustChangePassword: user.mustChangePassword,
    isFamilyMemberAccount: Boolean(user.managedByOwnerId),
    mfaEnabled: user.mfaEnabled,
  }
}

function toTokenPayload(user: User): IPayload {
  return {
    user_id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  }
}

function issueSession(user: User): SessionIssueResult {
  return {
    mfaRequired: false,
    token: signAccessToken(toTokenPayload(user)),
    user: toAuthUser(user),
  }
}

function formatSignInTimestamp(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function formatSignInMinuteKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')

  return `${year}${month}${day}${hour}${minute}`
}

async function recordSuccessfulSignIn(user: User, context?: SignInContext) {
  if (user.role !== USER_ROLES.USER) {
    return
  }

  const signedInAt = new Date()
  const formattedTime = formatSignInTimestamp(signedInAt)
  const locationHint = context?.ipAddress ? ` from IP ${context.ipAddress}` : ''
  const firstName =
    decryptPhiNullable(user.firstName)?.trim() ||
    decryptPhiNullable(user.name)?.split(' ')[0] ||
    'there'

  try {
    await Promise.all([
      notifySignIn(user.id, {
        formattedTime,
        locationHint,
        dedupeKey: `signin:${user.id}:${formatSignInMinuteKey(signedInAt)}`,
      }),
      sendSignInEmail({
        to: user.email,
        firstName,
        formattedTime,
        ipAddress: context?.ipAddress,
      }),
    ])
  } catch (error) {
    console.error('[auth] Failed to record sign-in notification:', error)
  }
}

function assertLoginRateLimit(email: string, context?: SignInContext) {
  const key = buildLoginRateLimitKey(email, context?.ipAddress)
  const limit = checkLoginRateLimit(key)
  if (!limit.allowed) {
    throw new HttpError(
      `Too many login attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
      429
    )
  }
  return key
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
      code: hashOtpCode(code),
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
      code: hashOtpCode(otp),
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
      firstName: encryptPhiRequired(input.firstName.trim()),
      lastName: encryptPhiRequired(input.lastName.trim()),
      name: encryptPhiRequired(name),
      password: passwordHash,
      role: USER_ROLES.USER,
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_CREATE,
    actorUserId: user.id,
    patientUserId: user.id,
    resourceType: 'PatientProfile',
    resourceId: user.id,
  })

  const code = await createOtp(user.id, OtpPurpose.EMAIL_VERIFICATION)
  await sendVerificationEmail(email, code)

  return user
}

export async function loginUser(
  email: string,
  password: string,
  context?: SignInContext
): Promise<SessionIssueResult | MfaChallengeResult> {
  const normalizedEmail = email.toLowerCase().trim()
  const rateKey = assertLoginRateLimit(normalizedEmail, context)
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (!user || !(await verifyPassword(password, user.password))) {
    recordLoginFailure(rateKey)
    await writeAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILURE,
      resourceType: 'Auth',
      ip: context?.ipAddress,
      metadata: { email: normalizedEmail },
    })
    throw new HttpError('Invalid email or password.', 401)
  }

  if (user.isBlocked) {
    throw new HttpError('Your account has been blocked. Please contact support.', 403)
  }

  if (!user.emailVerified) {
    throw new HttpError('Please verify your email before logging in.', 403)
  }

  if (user.managedByOwnerId) {
    await assertManagedMemberHasHouseholdAccess(user.id)
  }

  if (user.mfaEnabled && user.mfaSecret) {
    return {
      mfaRequired: true,
      mfaToken: signMfaPendingToken(toTokenPayload(user)),
    }
  }

  clearLoginFailures(rateKey)
  await recordSuccessfulSignIn(user, context)
  await writeAuditLog({
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    actorUserId: user.id,
    actorRole: user.role,
    resourceType: 'Auth',
    resourceId: user.id,
    ip: context?.ipAddress,
  })

  return issueSession(user)
}

export async function verifyMfaLogin(
  mfaToken: string,
  code: string,
  context?: SignInContext
): Promise<SessionIssueResult> {
  const payload = verifyMfaPendingToken(mfaToken)
  if (!payload) {
    throw new HttpError('Invalid or expired MFA session. Please sign in again.', 401)
  }

  const rateKey = assertLoginRateLimit(payload.email, context)
  const user = await prisma.user.findUnique({ where: { id: payload.user_id } })

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    throw new HttpError('MFA is not enabled for this account.', 400)
  }

  if (user.isBlocked) {
    throw new HttpError('Your account has been blocked. Please contact support.', 403)
  }

  if (user.managedByOwnerId) {
    await assertManagedMemberHasHouseholdAccess(user.id)
  }

  const secret = decryptMfaSecret(user.mfaSecret)
  if (!secret || !verifyTotpCode(secret, code)) {
    recordLoginFailure(rateKey)
    await writeAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILURE,
      actorUserId: user.id,
      resourceType: 'Auth',
      ip: context?.ipAddress,
      metadata: { reason: 'mfa_invalid' },
    })
    throw new HttpError('Invalid authenticator code.', 401)
  }

  clearLoginFailures(rateKey)
  await recordSuccessfulSignIn(user, context)
  await writeAuditLog({
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    actorUserId: user.id,
    actorRole: user.role,
    resourceType: 'Auth',
    resourceId: user.id,
    ip: context?.ipAddress,
    metadata: { mfa: true },
  })

  return issueSession(user)
}

export async function verifyEmail(email: string, otp: string, context?: SignInContext) {
  const user = await consumeValidOtp(email.toLowerCase().trim(), otp, OtpPurpose.EMAIL_VERIFICATION)

  if (!user) {
    throw new HttpError('Invalid or expired verification code.', 400)
  }

  if (user.isBlocked) {
    throw new HttpError('Your account has been blocked. Please contact support.', 403)
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  })

  await recordSuccessfulSignIn(verifiedUser, context)

  return issueSession(verifiedUser)
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

export async function getMfaStatus(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  return { mfaEnabled: user.mfaEnabled }
}

export async function setupMfa(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.mfaEnabled) {
    throw new HttpError('Authenticator MFA is already enabled.', 400)
  }

  const secret = generateMfaSecret()
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaSecret: encryptMfaSecret(secret),
      mfaEnabled: false,
    },
  })

  return {
    secret,
    otpauthUrl: buildOtpAuthUrl(user.email, secret),
  }
}

export async function enableMfa(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  const secret = decryptMfaSecret(user.mfaSecret)
  if (!secret) {
    throw new HttpError('Start MFA setup before enabling it.', 400)
  }

  if (!verifyTotpCode(secret, code)) {
    throw new HttpError('Invalid authenticator code.', 400)
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  })

  return { mfaEnabled: true }
}

export async function disableMfa(userId: string, code: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (!(await verifyPassword(password, user.password))) {
    throw new HttpError('Current password is incorrect.', 400)
  }

  const secret = decryptMfaSecret(user.mfaSecret)
  if (!user.mfaEnabled || !secret || !verifyTotpCode(secret, code)) {
    throw new HttpError('Invalid authenticator code.', 400)
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
    },
  })

  return { mfaEnabled: false }
}

export { GENERIC_RESET_MESSAGE }
