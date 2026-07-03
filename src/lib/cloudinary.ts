import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'

import { HttpError } from '~/lib/error'

type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto'

function ensureCloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = Bun.env

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new HttpError('Cloudinary is not configured on the server.', 503)
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export function uploadBuffer(
  buffer: Buffer,
  options: {
    folder: string
    resource_type?: CloudinaryResourceType
    public_id?: string
  }
) {
  ensureCloudinaryConfig()

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resource_type ?? 'auto',
        public_id: options.public_id,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed.'))
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
  ensureCloudinaryConfig()

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType === 'auto' ? 'image' : resourceType,
  })

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new HttpError('Failed to delete file from Cloudinary.', 500)
  }

  return result
}

export async function listCloudinaryFiles(prefix: string) {
  ensureCloudinaryConfig()

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
