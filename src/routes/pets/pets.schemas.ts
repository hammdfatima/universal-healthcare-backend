import { z } from '@hono/zod-openapi'

const petMedicationItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const petAllergyItemSchema = z.object({
  name: z.string().min(1),
  reaction: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const petVaccinationItemSchema = z.object({
  name: z.string().min(1),
  dateGiven: z.string().optional().default(''),
  nextDue: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const emergencyContactSchema = z
  .object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    relationship: z.string(),
    phone: z.string().nullable(),
    email: z.string(),
  })
  .nullable()

export const petSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    species: z.string(),
    breed: z.string().nullable(),
    sex: z.string().nullable(),
    color: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    microchipId: z.string().nullable(),
    veterinaryClinic: z.string().nullable(),
    veterinaryPhone: z.string().nullable(),
    veterinaryRecords: z.string().nullable(),
    medications: z.array(petMedicationItemSchema),
    allergies: z.array(petAllergyItemSchema),
    vaccinations: z.array(petVaccinationItemSchema),
    emergencyContactFamilyMemberId: z.string().nullable(),
    emergencyContact: emergencyContactSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Pet')

export const petsListSchema = z
  .object({
    pets: z.array(petSchema),
    limit: z.number().int(),
    usedSeats: z.number().int(),
    memberCount: z.number().int(),
    pausedPetCount: z.number().int(),
    supportsPets: z.boolean(),
  })
  .openapi('PetsList')

export const petSharingMemberSchema = z
  .object({
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    relationship: z.string(),
    isAccountOwner: z.boolean(),
    isSharedWith: z.boolean(),
  })
  .openapi('PetSharingMember')

export const petSharingSettingsSchema = z
  .object({
    petId: z.string(),
    petName: z.string(),
    members: z.array(petSharingMemberSchema),
  })
  .openapi('PetSharingSettings')

export const updatePetSharingBodySchema = z
  .object({
    granteeUserIds: z.array(z.string()).default([]),
  })
  .openapi('UpdatePetSharingBody')

export const sharedPetsListSchema = z
  .object({
    pets: z.array(petSchema),
  })
  .openapi('SharedPetsList')

export const sharedPetsQuerySchema = z.object({
  ownerUserId: z.string().min(1),
})

export const createPetBodySchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'Buddy' }),
    species: z.string().min(1).openapi({ example: 'Dog' }),
    breed: z.string().optional().default(''),
    sex: z.string().optional().default(''),
    color: z.string().optional().default(''),
    dateOfBirth: z.string().optional().default(''),
    microchipId: z.string().optional().default(''),
    veterinaryClinic: z.string().optional().default(''),
    veterinaryPhone: z.string().optional().default(''),
    veterinaryRecords: z.string().optional().default(''),
    medications: z.array(petMedicationItemSchema).optional().default([]),
    allergies: z.array(petAllergyItemSchema).optional().default([]),
    vaccinations: z.array(petVaccinationItemSchema).optional().default([]),
    emergencyContactFamilyMemberId: z.string().nullable().optional().default(null),
  })
  .openapi('CreatePetBody')

export const updatePetBodySchema = createPetBodySchema.openapi('UpdatePetBody')

export const petIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('PetMessageResponse')
