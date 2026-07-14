import { z } from '@hono/zod-openapi'

const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm (24-hour) format.')
  .openapi({ example: '08:00' })

export const medicationSchema = z
  .object({
    id: z.string(),
    medicineName: z.string(),
    condition: z.string(),
    prescribedBy: z.string(),
    dosage: z.string(),
    timesPerDay: z.number().int(),
    timesOfDay: z.array(z.string()),
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
    timesPerDay: z.coerce
      .number()
      .int()
      .min(1)
      .max(6)
      .openapi({ example: 2 }),
    timesOfDay: z
      .array(timeOfDaySchema)
      .min(1)
      .max(6)
      .openapi({ example: ['08:00', '20:00'] }),
    startDate: medicationDateSchema,
    endDate: optionalMedicationDateSchema,
  })
  .superRefine((value, ctx) => {
    if (value.timesOfDay.length !== value.timesPerDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide one dose time for each time per day.',
        path: ['timesOfDay'],
      })
    }
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
