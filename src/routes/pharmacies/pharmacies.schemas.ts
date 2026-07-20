import { z } from '@hono/zod-openapi'

export const pharmacySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    phone: z.string(),
    address: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Pharmacy')

export const pharmaciesListSchema = z
  .object({
    pharmacies: z.array(pharmacySchema),
  })
  .openapi('PharmaciesList')

export const createPharmacyBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'CVS Pharmacy' }),
    phone: z.string().min(1).openapi({ example: '(555) 214-8890' }),
    address: z.string().min(1).openapi({
      example: '1200 Wellness Ave, Suite 100',
    }),
    notes: z.string().optional().default('').openapi({
      example: 'Preferred for prescriptions and refills',
    }),
  })
  .openapi('CreatePharmacyBody')

export const updatePharmacyBodySchema = createPharmacyBodySchema.openapi('UpdatePharmacyBody')

export const pharmacyIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('PharmacyMessageResponse')
