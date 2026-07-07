import { z } from '@hono/zod-openapi'

export const medicationSchema = z
  .object({
    id: z.string(),
    medicineName: z.string(),
    condition: z.string(),
    prescribedBy: z.string(),
    dosage: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Medication')

export const medicationsListSchema = z
  .object({
    medications: z.array(medicationSchema),
  })
  .openapi('MedicationsList')

const medicationDateSchema = z.string().min(1).openapi({ example: '01/15/2024' })

const optionalMedicationDateSchema = z
  .union([medicationDateSchema, z.literal('')])
  .optional()
  .default('')

export const createMedicationBodySchema = z
  .object({
    medicineName: z.string().min(1).openapi({ example: 'Metformin' }),
    condition: z.string().min(1).openapi({ example: 'Type 2 Diabetes' }),
    prescribedBy: z.string().min(1).openapi({ example: 'Dr. Brooklyn Belle' }),
    dosage: z.string().min(1).openapi({ example: '500 mg' }),
    startDate: medicationDateSchema,
    endDate: optionalMedicationDateSchema,
  })
  .openapi('CreateMedicationBody')

export const updateMedicationBodySchema = createMedicationBodySchema.openapi(
  'UpdateMedicationBody'
)

export const medicationIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('MedicationMessageResponse')
