import { z } from '@hono/zod-openapi'

const optionalEmailSchema = z
  .union([z.email(), z.literal('')])
  .optional()
  .default('')

export const careProviderSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    phone: z.string(),
    email: z.string().nullable(),
    clinicDetails: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('CareProvider')

export const careProvidersListSchema = z
  .object({
    providers: z.array(careProviderSchema),
  })
  .openapi('CareProvidersList')

export const createCareProviderBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'Dr. Brooklyn Belle' }),
    phone: z.string().min(1).openapi({ example: '(555) 214-8890' }),
    email: optionalEmailSchema.openapi({ example: 'brooklyn.belle@uhcclinic.com' }),
    clinicDetails: z.string().optional().default('').openapi({
      example: 'UHC Internal Medicine · 1200 Wellness Ave, Suite 300',
    }),
  })
  .openapi('CreateCareProviderBody')

export const updateCareProviderBodySchema = createCareProviderBodySchema.openapi(
  'UpdateCareProviderBody'
)

export const careProviderIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('CareProviderMessageResponse')
