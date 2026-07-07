import { z } from '@hono/zod-openapi'

export const imagingResultSchema = z
  .object({
    id: z.string(),
    fileName: z.string(),
    testType: z.string(),
    scanType: z.string(),
    scanDate: z.string(),
    fileUrl: z.string(),
    filePublicId: z.string(),
    fileMimeType: z.string(),
    fileResourceType: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('ImagingResult')

export const imagingResultsListSchema = z
  .object({
    imagingResults: z.array(imagingResultSchema),
  })
  .openapi('ImagingResultsList')

export const createImagingResultBodySchema = z
  .object({
    fileName: z.string().min(1).openapi({ example: 'chest-xray-march-2025.pdf' }),
    testType: z.string().min(1).openapi({ example: 'Diagnostic' }),
    scanType: z.string().min(1).openapi({ example: 'X-Ray' }),
    scanDate: z.string().min(1).openapi({ example: '03/18/2025' }),
    fileUrl: z.string().url().openapi({
      example: 'https://res.cloudinary.com/demo/image/upload/v123/scan.pdf',
    }),
    filePublicId: z.string().min(1).openapi({
      example: 'universal-healthcare/users/clx123/chest-xray',
    }),
    fileMimeType: z.string().min(1).openapi({ example: 'application/pdf' }),
    fileResourceType: z.string().optional().openapi({ example: 'image' }),
  })
  .openapi('CreateImagingResultBody')

export const updateImagingResultBodySchema = createImagingResultBodySchema.openapi(
  'UpdateImagingResultBody'
)

export const imagingResultIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('ImagingResultMessageResponse')
