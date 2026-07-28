import type { UserQuery } from '~/generated/prisma'
import { USER_ROLES } from '~/config/roles'
import { sendUserQueryReplyEmail } from '~/lib/email'
import { HttpError } from '~/lib/error'
import {
  decryptPhi,
  decryptPhiNullable,
  encryptPhiNullable,
  encryptPhiRequired,
} from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import {
  getUserQuerySubjectLabel,
  USER_QUERY_SUBJECTS,
} from '~/lib/user-query-utils'

type CreateUserQueryInput = {
  fullName: string
  email: string
  subject: string
  message: string
}

function toUserQueryResponse(record: UserQuery) {
  return {
    id: record.id,
    fullName: decryptPhi(record.fullName),
    // Email stays plaintext so admins/support can reply without a decrypt round-trip
    // on every list filter; message body / name / reply are encrypted.
    email: record.email,
    subject: record.subject,
    subjectLabel: getUserQuerySubjectLabel(record.subject),
    message: decryptPhi(record.message),
    isResolved: record.isResolved,
    reply: decryptPhiNullable(record.reply),
    repliedAt: record.repliedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function assertValidSubject(subject: string) {
  if (!(subject in USER_QUERY_SUBJECTS)) {
    throw new HttpError('Invalid subject selected.', 400)
  }
}

export async function createUserQuery(input: CreateUserQueryInput) {
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const subject = input.subject.trim()
  const message = input.message.trim()

  assertValidSubject(subject)

  const record = await prisma.userQuery.create({
    data: {
      fullName: encryptPhiRequired(fullName),
      email,
      subject,
      message: encryptPhiRequired(message),
    },
  })

  return toUserQueryResponse(record)
}

export async function listAdminUserQueries() {
  const queries = await prisma.userQuery.findMany({
    orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
  })

  return {
    queries: queries.map(toUserQueryResponse),
  }
}

export async function getAdminUserQueryById(queryId: string) {
  const record = await prisma.userQuery.findUnique({
    where: { id: queryId },
  })

  if (!record) {
    throw new HttpError('User query not found.', 404)
  }

  return toUserQueryResponse(record)
}

async function assertAdminUser(adminUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: adminUserId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.ADMIN) {
    throw new HttpError('Forbidden', 403)
  }

  return user
}

export async function replyToUserQuery(
  adminUserId: string,
  queryId: string,
  reply: string
) {
  await assertAdminUser(adminUserId)

  const record = await prisma.userQuery.findUnique({
    where: { id: queryId },
  })

  if (!record) {
    throw new HttpError('User query not found.', 404)
  }

  if (record.isResolved) {
    throw new HttpError('This query has already been resolved.', 400)
  }

  const trimmedReply = reply.trim()

  if (!trimmedReply) {
    throw new HttpError('Reply message is required.', 400)
  }

  const subjectLabel = getUserQuerySubjectLabel(record.subject)
  const fullName = decryptPhi(record.fullName)
  const message = decryptPhi(record.message)

  await sendUserQueryReplyEmail({
    to: record.email,
    fullName,
    subjectLabel,
    originalMessage: message,
    reply: trimmedReply,
  })

  const updated = await prisma.userQuery.update({
    where: { id: queryId },
    data: {
      reply: encryptPhiNullable(trimmedReply),
      isResolved: true,
      repliedAt: new Date(),
      repliedById: adminUserId,
    },
  })

  return toUserQueryResponse(updated)
}
