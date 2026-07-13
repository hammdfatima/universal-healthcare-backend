import type { ImagingResult } from '~/generated/prisma'
import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { deleteCloudinaryFile } from '~/lib/cloudinary'
import { HttpError } from '~/lib/error'
import { notifyImagingResultUploaded } from '~/lib/notifications'
import { decryptPhi, encryptPhiRequired } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'

type ImagingResultInput = {
  fileName: string
  testType: string
  scanType: string
  scanDate: string
  fileUrl: string
  filePublicId: string
  fileMimeType: string
  fileResourceType?: string
}

type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto'

function formatImagingDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()

  return `${month}/${day}/${year}`
}

function parseImagingDate(value: string, fieldLabel: string): Date {
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

function assertScanDateNotInFuture(scanDate: Date) {
  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const scanUtc = Date.UTC(scanDate.getUTCFullYear(), scanDate.getUTCMonth(), scanDate.getUTCDate())

  if (scanUtc > todayUtc) {
    throw new HttpError('Scan date cannot be in the future.', 400)
  }
}

function assertOwnedFile(userId: string, publicId: string) {
  const userPrefix = `universal-healthcare/users/${userId}`

  if (!publicId.startsWith(userPrefix)) {
    throw new HttpError('Invalid file reference.', 400)
  }
}

function toImagingResultResponse(record: ImagingResult) {
  return {
    id: record.id,
    fileName: decryptPhi(record.fileName),
    testType: decryptPhi(record.testType),
    scanType: decryptPhi(record.scanType),
    scanDate: formatImagingDate(record.scanDate),
    fileUrl: decryptPhi(record.fileUrl),
    filePublicId: decryptPhi(record.filePublicId),
    fileMimeType: record.fileMimeType,
    fileResourceType: record.fileResourceType,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function getOwnedImagingResult(userId: string, imagingResultId: string) {
  const record = await prisma.imagingResult.findFirst({
    where: {
      id: imagingResultId,
      userId,
    },
  })

  if (!record) {
    throw new HttpError('Imaging result not found.', 404)
  }

  return record
}

async function deleteImagingResultFile(record: ImagingResult) {
  const resourceType = (record.fileResourceType ?? 'image') as CloudinaryResourceType

  try {
    await deleteCloudinaryFile(decryptPhi(record.filePublicId), resourceType)
  } catch {
    // File may already be removed from Cloudinary.
  }
}

function normalizeInput(input: ImagingResultInput, userId: string) {
  const filePublicId = input.filePublicId.trim()
  assertOwnedFile(userId, filePublicId)

  const scanDate = parseImagingDate(input.scanDate, 'scan date')
  assertScanDateNotInFuture(scanDate)

  return {
    fileName: input.fileName.trim(),
    testType: input.testType.trim(),
    scanType: input.scanType.trim(),
    scanDate,
    fileUrl: input.fileUrl.trim(),
    filePublicId,
    fileMimeType: input.fileMimeType.trim(),
    fileResourceType: input.fileResourceType?.trim() || null,
  }
}

export async function listImagingResults(userId: string) {
  await assertPatientUser(userId)

  const imagingResults = await prisma.imagingResult.findMany({
    where: { userId },
    orderBy: { scanDate: 'desc' },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'ImagingResult',
  })

  return {
    imagingResults: imagingResults.map(toImagingResultResponse),
  }
}

export async function createImagingResult(userId: string, input: ImagingResultInput) {
  await assertPatientUser(userId)

  const plaintext = normalizeInput(input, userId)

  const record = await prisma.imagingResult.create({
    data: {
      userId,
      ...plaintext,
      fileName: encryptPhiRequired(plaintext.fileName),
      testType: encryptPhiRequired(plaintext.testType),
      scanType: encryptPhiRequired(plaintext.scanType),
      fileUrl: encryptPhiRequired(plaintext.fileUrl),
      filePublicId: encryptPhiRequired(plaintext.filePublicId),
    },
  })

  await Promise.all([
    notifyImagingResultUploaded(userId, toImagingResultResponse(record)),
    writeAuditLog({
      action: AUDIT_ACTIONS.PHI_CREATE,
      actorUserId: userId,
      patientUserId: userId,
      resourceType: 'ImagingResult',
      resourceId: record.id,
    }),
  ])

  return toImagingResultResponse(record)
}

export async function updateImagingResult(
  userId: string,
  imagingResultId: string,
  input: ImagingResultInput
) {
  await assertPatientUser(userId)

  const existing = await getOwnedImagingResult(userId, imagingResultId)
  const plaintext = normalizeInput(input, userId)

  if (decryptPhi(existing.filePublicId) !== plaintext.filePublicId) {
    await deleteImagingResultFile(existing)
  }

  const record = await prisma.imagingResult.update({
    where: { id: imagingResultId },
    data: {
      ...plaintext,
      fileName: encryptPhiRequired(plaintext.fileName),
      testType: encryptPhiRequired(plaintext.testType),
      scanType: encryptPhiRequired(plaintext.scanType),
      fileUrl: encryptPhiRequired(plaintext.fileUrl),
      filePublicId: encryptPhiRequired(plaintext.filePublicId),
    },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'ImagingResult',
    resourceId: record.id,
  })

  return toImagingResultResponse(record)
}

export async function deleteImagingResult(userId: string, imagingResultId: string) {
  await assertPatientUser(userId)

  const record = await getOwnedImagingResult(userId, imagingResultId)

  await deleteImagingResultFile(record)

  await prisma.imagingResult.delete({
    where: { id: imagingResultId },
  })
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'ImagingResult',
    resourceId: imagingResultId,
  })
}
