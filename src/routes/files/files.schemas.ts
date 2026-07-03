import { z } from '@hono/zod-openapi'

export const cloudinaryResourceTypeSchema = z.enum(['image', 'video', 'raw', 'auto'])

export const uploadedFileSchema = z
  .object({
    publicId: z.string(),
    url: z.string(),
    secureUrl: z.string(),
    format: z.string().nullable(),
    resourceType: z.string(),
    bytes: z.number(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    originalFilename: z.string(),
  })
  .openapi('UploadedFile')

export const uploadedFileListSchema = z.array(uploadedFileSchema)

export const deleteFileBodySchema = z
  .object({
    publicId: z.string().min(1).openapi({
      example: 'universal-healthcare/users/clx123/profile-photo',
    }),
    resourceType: cloudinaryResourceTypeSchema.optional().openapi({
      example: 'image',
    }),
  })
  .openapi('DeleteFileBody')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('FileMessageResponse')
