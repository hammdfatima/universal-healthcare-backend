import { z } from '@hono/zod-openapi'

export const vaccinationSchema = z
  .object({
    id: z.string(),
    vaccineName: z.string(),
    prescribedBy: z.string(),
    administeredBy: z.string(),
    dosage: z.string(),
    date: z.string(),
    time: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Vaccination')

export const vaccinationsListSchema = z
  .object({
    vaccinations: z.array(vaccinationSchema),
  })
  .openapi('VaccinationsList')

export const createVaccinationBodySchema = z
  .object({
    vaccineName: z.string().min(1).openapi({ example: 'Influenza (Flu)' }),
    prescribedBy: z.string().min(1).openapi({ example: 'Dr. Brooklyn Belle' }),
    administeredBy: z.string().min(1).openapi({ example: 'CVS Pharmacy' }),
    dosage: z.string().min(1).openapi({ example: '0.5 mL' }),
    date: z.string().min(1).openapi({ example: '10/15/2025' }),
    time: z.string().min(1).openapi({ example: '10:30' }),
  })
  .openapi('CreateVaccinationBody')

export const updateVaccinationBodySchema = createVaccinationBodySchema.openapi(
  'UpdateVaccinationBody'
)

export const vaccinationIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('VaccinationMessageResponse')
