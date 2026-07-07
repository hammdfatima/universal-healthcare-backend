import { USER_ROLES } from '~/config/roles'
import type { IPayload } from '~/types'
import {
  deleteCloudinaryFile,
  listCloudinaryFiles,
  uploadBuffer,
} from '~/lib/cloudinary'
import { HttpError } from '~/lib/error'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto'

function getUploadResourceType(file: File): CloudinaryResourceType {
  const mimeType = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'image'
  }

  if (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)
  ) {
    return 'image'
  }

  return 'auto'
}

function getDetectedMimeType(file: File): string {
  if (file.type) {
    return file.type
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    default:
      return ''
  }
}

function getUploadFolder(user: IPayload) {
  return user.role === USER_ROLES.ADMIN
    ? `universal-healthcare/admin/${user.user_id}`
    : `universal-healthcare/users/${user.user_id}`
}

function assertCanAccessFile(user: IPayload, publicId: string) {
  const userPrefix = `universal-healthcare/users/${user.user_id}`
  const adminPrefix = `universal-healthcare/admin/${user.user_id}`

  if (publicId.startsWith(userPrefix) || publicId.startsWith(adminPrefix)) {
    return
  }

  if (user.role === USER_ROLES.ADMIN && publicId.startsWith('universal-healthcare/')) {
    return
  }

  throw new HttpError('You do not have permission to access this file.', 403)
}

function validateUploadFile(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    throw new HttpError('A valid file is required.', 400)
  }

  if (!ALLOWED_MIME_TYPES.has(getDetectedMimeType(file))) {
    throw new HttpError('Unsupported file type. Allowed: JPG, PNG, WEBP, GIF, PDF.', 400)
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new HttpError('File size exceeds the 10MB limit.', 400)
  }
}

function toUploadedFileResponse(file: File, result: Awaited<ReturnType<typeof uploadBuffer>>) {
  return {
    publicId: result.public_id,
    url: result.url,
    secureUrl: result.secure_url,
    format: result.format ?? null,
    resourceType: result.resource_type,
    bytes: result.bytes,
    width: result.width ?? null,
    height: result.height ?? null,
    originalFilename: file.name,
  }
}

function toListedFileResponse(resource: {
  public_id: string
  secure_url: string
  url: string
  format: string
  resource_type: string
  bytes: number
  width?: number
  height?: number
}) {
  return {
    publicId: resource.public_id,
    url: resource.url,
    secureUrl: resource.secure_url,
    format: resource.format ?? null,
    resourceType: resource.resource_type,
    bytes: resource.bytes,
    width: resource.width ?? null,
    height: resource.height ?? null,
    originalFilename: resource.public_id.split('/').pop() ?? resource.public_id,
  }
}

export async function uploadUserFile(file: File, user: IPayload) {
  validateUploadFile(file)

  const folder = getUploadFolder(user)
  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await uploadBuffer(buffer, {
    folder,
    resource_type: getUploadResourceType(file),
  })

  return toUploadedFileResponse(file, result)
}

export async function deleteUserFile(
  user: IPayload,
  publicId: string,
  resourceType: CloudinaryResourceType = 'image'
) {
  assertCanAccessFile(user, publicId)
  await deleteCloudinaryFile(publicId, resourceType)

  return { message: 'File deleted successfully.' }
}

export async function listUserFiles(user: IPayload) {
  const folder = getUploadFolder(user)
  const resources = await listCloudinaryFiles(folder)

  return resources.map(toListedFileResponse)
}
