import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'

import { HttpError } from '~/lib/error'

type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto'

type CloudinaryCredentials = {
  cloud_name: string
  api_key: string
  api_secret: string
}

function getCloudinaryCredentials(): CloudinaryCredentials {
  const cloudName = Bun.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = Bun.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = Bun.env.CLOUDINARY_API_SECRET?.trim()
  const uploadPreset = Bun.env.CLOUDINARY_UPLOAD_PRESET?.trim()

  if (!cloudName || !apiKey) {
    throw new HttpError('Cloudinary is not configured on the server.', 503)
  }

  if (!apiSecret && !uploadPreset) {
    throw new HttpError(
      'Cloudinary is not configured on the server. Set CLOUDINARY_API_SECRET or CLOUDINARY_UPLOAD_PRESET.',
      503
    )
  }

  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret ?? '',
  }
}

function getCloudinaryErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return 'Cloudinary upload failed.'
}

function getSignedUploadOptions(
  credentials: CloudinaryCredentials,
  options: {
    folder: string
    resource_type?: CloudinaryResourceType
    public_id?: string
  }
) {
  const uploadPreset = Bun.env.CLOUDINARY_UPLOAD_PRESET?.trim()

  return {
    api_key: credentials.api_key,
    api_secret: credentials.api_secret,
    cloud_name: credentials.cloud_name,
    folder: options.folder,
    resource_type: options.resource_type ?? 'auto',
    public_id: options.public_id,
    use_filename: true,
    unique_filename: true,
    ...(uploadPreset && !credentials.api_secret
      ? { upload_preset: uploadPreset }
      : {}),
  }
}

function applyCloudinaryConfig(credentials: CloudinaryCredentials) {
  cloudinary.config({
    ...credentials,
    secure: true,
  })
}

export function configureCloudinary() {
  const credentials = getCloudinaryCredentials()
  applyCloudinaryConfig(credentials)
  return credentials
}

function toCloudinaryError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error
  }

  const message = getCloudinaryErrorMessage(error)

  if (message.includes('Upload preset must be specified when using unsigned upload')) {
    return new HttpError(
      'Cloudinary upload is misconfigured. Verify CLOUDINARY_API_SECRET in the backend .env and restart the server.',
      503
    )
  }

  if (message.includes('Invalid image file')) {
    return new HttpError('The uploaded image file is invalid or corrupted.', 400)
  }

  if (
    message.toLowerCase().includes('file size') ||
    message.toLowerCase().includes('too large') ||
    message.toLowerCase().includes('max file size')
  ) {
    return new HttpError('File size exceeds the 10MB limit.', 400)
  }

  const httpCode =
    error && typeof error === 'object' && 'http_code' in error
      ? Number((error as { http_code?: unknown }).http_code)
      : undefined

  return new HttpError(message, httpCode && httpCode >= 400 && httpCode < 600 ? httpCode : 500)
}

export function uploadBuffer(
  buffer: Buffer,
  options: {
    folder: string
    resource_type?: CloudinaryResourceType
    public_id?: string
  }
) {
  const credentials = getCloudinaryCredentials()
  applyCloudinaryConfig(credentials)

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      getSignedUploadOptions(credentials, options),
      (error, result) => {
        if (error || !result) {
          reject(toCloudinaryError(error ?? new Error('Cloudinary upload failed.')))
          return
        }

        resolve(result)
      }
    )

    stream.end(buffer)
  })
}

export async function deleteCloudinaryFile(
  publicId: string,
  resourceType: CloudinaryResourceType = 'image'
) {
  const credentials = getCloudinaryCredentials()
  applyCloudinaryConfig(credentials)

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType === 'auto' ? 'image' : resourceType,
  })

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new HttpError('Failed to delete file from Cloudinary.', 500)
  }

  return result
}

export async function listCloudinaryFiles(prefix: string) {
  const credentials = getCloudinaryCredentials()
  applyCloudinaryConfig(credentials)

  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix,
    max_results: 100,
  })

  return result.resources as Array<{
    public_id: string
    secure_url: string
    url: string
    format: string
    resource_type: string
    bytes: number
    width?: number
    height?: number
    created_at: string
  }>
}
