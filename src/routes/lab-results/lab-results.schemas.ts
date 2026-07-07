import { z } from '@hono/zod-openapi'

export const labResultSchema = z
  .object({
    id: z.string(),
    fileName: z.string(),
    testType: z.string(),
    testDate: z.string(),
    fileUrl: z.string(),
    filePublicId: z.string(),
    fileMimeType: z.string(),
    fileResourceType: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('LabResult')

export const labResultsListSchema = z
  .object({
    labResults: z.array(labResultSchema),
  })
  .openapi('LabResultsList')

export const createLabResultBodySchema = z
  .object({
    fileName: z.string().min(1).openapi({ example: 'lipid-panel-march-2025.pdf' }),
    testType: z.string().min(1).openapi({ example: 'Lipid Panel' }),
    testDate: z.string().min(1).openapi({ example: '03/12/2025' }),
    fileUrl: z.string().url().openapi({
      example: 'https://res.cloudinary.com/demo/image/upload/v123/report.pdf',
    }),
    filePublicId: z.string().min(1).openapi({
      example: 'universal-healthcare/users/clx123/lipid-panel',
    }),
    fileMimeType: z.string().min(1).openapi({ example: 'application/pdf' }),
    fileResourceType: z.string().optional().openapi({ example: 'raw' }),
  })
  .openapi('CreateLabResultBody')

export const updateLabResultBodySchema = createLabResultBodySchema.openapi(
  'UpdateLabResultBody'
)

export const labResultIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('LabResultMessageResponse')
