import { z } from '@hono/zod-openapi'

export const householdMemberSchema = z
  .object({
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    relationship: z.string(),
    isAccountOwner: z.boolean(),
    isSharedWith: z.boolean(),
  })
  .openapi('HouseholdMemberSharing')

export const sharingSettingsSchema = z
  .object({
    shareWithAll: z.boolean(),
    isManagedMember: z.boolean(),
    members: z.array(householdMemberSchema),
  })
  .openapi('MedicalRecordSharingSettings')

export const sidebarFamilyMemberSchema = z
  .object({
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    relationship: z.string(),
    isAccountOwner: z.boolean(),
    hasSharedRecordsWithMe: z.boolean(),
  })
  .openapi('SidebarFamilyMember')

export const sidebarFamilySchema = z
  .object({
    isManagedMember: z.boolean(),
    canManageFamily: z.boolean(),
    members: z.array(sidebarFamilyMemberSchema),
  })
  .openapi('SidebarFamilyList')

export const updateSharingBodySchema = z
  .object({
    shareWithAll: z.boolean(),
    granteeUserIds: z.array(z.string()).default([]),
  })
  .openapi('UpdateMedicalRecordSharingBody')

export const accessiblePatientSchema = z
  .object({
    userId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    relationship: z.string(),
    isSelf: z.boolean(),
  })
  .openapi('AccessiblePatient')

export const accessiblePatientsSchema = z
  .object({
    patients: z.array(accessiblePatientSchema),
  })
  .openapi('AccessiblePatientsList')

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('MedicalRecordSharingMessageResponse')

export const patientUserIdQuerySchema = z.object({
  patientUserId: z.string().optional(),
})
