import type { LabResult } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { deleteCloudinaryFile } from '~/lib/cloudinary'
import { HttpError } from '~/lib/error'
import { notifyLabResultUploaded } from '~/lib/notifications'
import { decryptPhi, encryptPhiRequired } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { resolveVaultPatientId } from '~/lib/vault-access'

type LabResultInput = {
  fileName: string
  testType: string
  testDate: string
  fileUrl: string
  filePublicId: string
  fileMimeType: string
  fileResourceType?: string
}

type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto'

function formatLabDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

function parseLabDate(value: string, fieldLabel: string): Date {
  const trimmed = value.trim()
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)

  if (slashMatch) {
    const month = Number(slashMatch[1])
    const day = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const parsed = new Date(Date.UTC(year, month - 1, day))

    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new HttpError(`Invalid ${fieldLabel}.`, 400)
    }

    return parsed
  }

  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(`Invalid ${fieldLabel}.`, 400)
  }

  return parsed
}

function assertTestDateNotInFuture(testDate: Date) {
  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const testUtc = Date.UTC(testDate.getUTCFullYear(), testDate.getUTCMonth(), testDate.getUTCDate())

  if (testUtc > todayUtc) {
    throw new HttpError('Test date cannot be in the future.', 400)
  }
}

function assertOwnedFile(userId: string, publicId: string) {
  const userPrefix = `universal-healthcare/users/${userId}`

  if (!publicId.startsWith(userPrefix)) {
    throw new HttpError('Invalid file reference.', 400)
  }
}

function toLabResultResponse(record: LabResult) {
  return {
    id: record.id,
    fileName: decryptPhi(record.fileName),
    testType: decryptPhi(record.testType),
    testDate: formatLabDate(record.testDate),
    fileUrl: decryptPhi(record.fileUrl),
    filePublicId: decryptPhi(record.filePublicId),
    fileMimeType: record.fileMimeType,
    fileResourceType: record.fileResourceType,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function getOwnedLabResult(userId: string, labResultId: string) {
  const record = await prisma.labResult.findFirst({
    where: {
      id: labResultId,
      userId,
    },
  })

  if (!record) {
    throw new HttpError('Lab result not found.', 404)
  }

  return record
}

async function deleteLabResultFile(record: LabResult) {
  const resourceType = (record.fileResourceType ?? 'image') as CloudinaryResourceType

  try {
    await deleteCloudinaryFile(decryptPhi(record.filePublicId), resourceType)
  } catch {
    // File may already be removed from Cloudinary.
  }
}

function normalizeInput(input: LabResultInput, userId: string) {
  const filePublicId = input.filePublicId.trim()
  assertOwnedFile(userId, filePublicId)

  const testDate = parseLabDate(input.testDate, 'test date')
  assertTestDateNotInFuture(testDate)

  return {
    fileName: input.fileName.trim(),
    testType: input.testType.trim(),
    testDate,
    fileUrl: input.fileUrl.trim(),
    filePublicId,
    fileMimeType: input.fileMimeType.trim(),
    fileResourceType: input.fileResourceType?.trim() || null,
  }
}

export async function listLabResults(
  actorUserId: string,
  requestedPatientUserId?: string | null
) {
  const userId = await resolveVaultPatientId(actorUserId, requestedPatientUserId)

  const labResults = await prisma.labResult.findMany({
    where: { userId },
    orderBy: { testDate: 'desc' },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId,
    patientUserId: userId,
    resourceType: 'LabResult',
  })

  return {
    labResults: labResults.map(toLabResultResponse),
  }
}

export async function createLabResult(userId: string, input: LabResultInput) {
  await assertPatientUser(userId)

  const plaintext = normalizeInput(input, userId)

  const record = await prisma.labResult.create({
    data: {
      userId,
      ...plaintext,
      fileName: encryptPhiRequired(plaintext.fileName),
      testType: encryptPhiRequired(plaintext.testType),
      fileUrl: encryptPhiRequired(plaintext.fileUrl),
      filePublicId: encryptPhiRequired(plaintext.filePublicId),
    },
  })

  await Promise.all([
    notifyLabResultUploaded(userId, toLabResultResponse(record)),
    writeAuditLog({
      action: AUDIT_ACTIONS.PHI_CREATE,
      actorUserId: userId,
      patientUserId: userId,
      resourceType: 'LabResult',
      resourceId: record.id,
    }),
  ])

  return toLabResultResponse(record)
}

export async function updateLabResult(userId: string, labResultId: string, input: LabResultInput) {
  await assertPatientUser(userId)

  const existing = await getOwnedLabResult(userId, labResultId)
  const plaintext = normalizeInput(input, userId)

  if (decryptPhi(existing.filePublicId) !== plaintext.filePublicId) {
    await deleteLabResultFile(existing)
  }

  const record = await prisma.labResult.update({
    where: { id: labResultId },
    data: {
      ...plaintext,
      fileName: encryptPhiRequired(plaintext.fileName),
      testType: encryptPhiRequired(plaintext.testType),
      fileUrl: encryptPhiRequired(plaintext.fileUrl),
      filePublicId: encryptPhiRequired(plaintext.filePublicId),
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'LabResult',
    resourceId: record.id,
  })

  return toLabResultResponse(record)
}

export async function deleteLabResult(userId: string, labResultId: string) {
  await assertPatientUser(userId)

  const record = await getOwnedLabResult(userId, labResultId)

  await deleteLabResultFile(record)

  await prisma.labResult.delete({
    where: { id: labResultId },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'LabResult',
    resourceId: labResultId,
  })
}
