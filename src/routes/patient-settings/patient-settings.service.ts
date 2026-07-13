import { USER_ROLES } from '~/config/roles'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { deleteCloudinaryFile } from '~/lib/cloudinary'
import { HttpError } from '~/lib/error'
import { hashPassword, verifyPassword } from '~/lib/password'
import {
  decryptDateNullable,
  decryptPhi,
  decryptPhiNullable,
  decryptStringArray,
} from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { getStripeClient } from '~/lib/stripe'
import {
  getPatientProfile,
  updatePatientProfileData,
} from '~/routes/patient-profile/patient-profile.service'

type UpdateProfileInput = {
  firstName: string
  lastName: string
  phone: string
  profileImage?: string
  dateOfBirth: string
  bloodGroup: string
  gender: string
  address: string
}

type UpdateAccountInput = {
  emailNotifications: boolean
  inAppNotifications: boolean
}

export async function getPatientSettings(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  const profile = await getPatientProfile(userId)

  return {
    profile,
    account: {
      emailNotifications: user.emailNotifications,
      inAppNotifications: user.inAppNotifications,
    },
  }
}

export async function updatePatientSettingsProfile(userId: string, input: UpdateProfileInput) {
  const profile = await updatePatientProfileData(userId, input)

  return {
    profile,
    account: await getAccountSettings(userId),
  }
}

export async function updatePatientAccountSettings(userId: string, input: UpdateAccountInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailNotifications: input.emailNotifications,
      inAppNotifications: input.inAppNotifications,
    },
  })

  return {
    profile: await getPatientProfile(userId),
    account: {
      emailNotifications: user.emailNotifications,
      inAppNotifications: user.inAppNotifications,
    },
  }
}

async function getAccountSettings(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  return {
    emailNotifications: user.emailNotifications,
    inAppNotifications: user.inAppNotifications,
  }
}

export async function changePatientPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)

  if (!isCurrentPasswordValid) {
    throw new HttpError('Current password is incorrect.', 400)
  }

  if (currentPassword === newPassword) {
    throw new HttpError('New password must be different from your current password.', 400)
  }

  const passwordHash = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: passwordHash,
      mustChangePassword: false,
    },
  })
}

type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto'

async function deleteUserUploadedFiles(userId: string) {
  const [labResults, imagingResults] = await Promise.all([
    prisma.labResult.findMany({ where: { userId } }),
    prisma.imagingResult.findMany({ where: { userId } }),
  ])

  for (const record of [...labResults, ...imagingResults]) {
    const resourceType = (record.fileResourceType ?? 'image') as CloudinaryResourceType

    try {
      await deleteCloudinaryFile(decryptPhi(record.filePublicId), resourceType)
    } catch {
      // File may already be removed from Cloudinary.
    }
  }
}

async function cancelUserStripeSubscription(userId: string) {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
  })

  if (!subscription?.stripeSubscriptionId) {
    return
  }

  try {
    const stripe = getStripeClient()
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
  } catch {
    // Continue account deletion even if Stripe cancellation fails.
  }
}

async function permanentlyDeleteUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) {
    return
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Only patient accounts can be deleted.', 400)
  }

  await deleteUserUploadedFiles(userId)
  await cancelUserStripeSubscription(userId)
  await prisma.user.delete({ where: { id: userId } })
}

export async function exportPatientData(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  const [
    profile,
    medications,
    allergies,
    healthHistory,
    vaccinations,
    labResults,
    imagingResults,
    careProviders,
    familyMembers,
  ] = await Promise.all([
    getPatientProfile(userId),
    prisma.medication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.allergy.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.healthHistoryEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.vaccination.findMany({ where: { userId }, orderBy: { vaccinationDate: 'desc' } }),
    prisma.labResult.findMany({ where: { userId }, orderBy: { testDate: 'desc' } }),
    prisma.imagingResult.findMany({ where: { userId }, orderBy: { scanDate: 'desc' } }),
    prisma.careProvider.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.familyMember.findMany({
      where: { ownerId: userId },
      include: {
        memberUser: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'PatientDataExport',
    resourceId: userId,
  })

  return {
    exportedAt: new Date().toISOString(),
    profile,
    medications: medications.map(record => ({
      ...record,
      medicineName: decryptPhi(record.medicineName),
      condition: decryptPhi(record.condition),
      prescribedBy: decryptPhi(record.prescribedBy),
      dosage: decryptPhi(record.dosage),
      startDate: record.startDate.toISOString(),
      endDate: record.endDate?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    allergies: allergies.map(record => ({
      ...record,
      allergyType: decryptPhi(record.allergyType),
      nature: decryptPhi(record.nature),
      symptoms: decryptStringArray(record.symptoms),
      triggers: decryptStringArray(record.triggers),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    healthHistory: healthHistory.map(record => ({
      ...record,
      illnessName: decryptPhi(record.illnessName),
      prescribedBy: decryptPhi(record.prescribedBy),
      details: decryptPhi(record.details),
      diagnosisDate: record.diagnosisDate.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    vaccinations: vaccinations.map(record => ({
      ...record,
      vaccineName: decryptPhi(record.vaccineName),
      prescribedBy: decryptPhi(record.prescribedBy),
      administeredBy: decryptPhi(record.administeredBy),
      dosage: decryptPhi(record.dosage),
      time: decryptPhi(record.time),
      vaccinationDate: record.vaccinationDate.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    labResults: labResults.map(record => ({
      ...record,
      fileName: decryptPhi(record.fileName),
      testType: decryptPhi(record.testType),
      fileUrl: decryptPhi(record.fileUrl),
      filePublicId: decryptPhi(record.filePublicId),
      testDate: record.testDate.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    imagingResults: imagingResults.map(record => ({
      ...record,
      fileName: decryptPhi(record.fileName),
      testType: decryptPhi(record.testType),
      scanType: decryptPhi(record.scanType),
      fileUrl: decryptPhi(record.fileUrl),
      filePublicId: decryptPhi(record.filePublicId),
      scanDate: record.scanDate.toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    careProviders: careProviders.map(record => ({
      ...record,
      name: decryptPhi(record.name),
      phone: decryptPhi(record.phone),
      email: decryptPhiNullable(record.email),
      clinicDetails: decryptPhiNullable(record.clinicDetails),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    familyMembers: familyMembers.map(record => ({
      id: record.id,
      relationship: record.relationship,
      isEmergencyContact: record.isEmergencyContact,
      member: {
        ...record.memberUser,
        firstName: decryptPhiNullable(record.memberUser.firstName),
        lastName: decryptPhiNullable(record.memberUser.lastName),
        phone: decryptPhiNullable(record.memberUser.phone),
        dateOfBirth: decryptDateNullable(record.memberUser.dateOfBirth)?.toISOString() ?? null,
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
  }
}

export async function deletePatientAccount(userId: string, confirmation: string) {
  if (confirmation !== 'DELETE') {
    throw new HttpError('Type DELETE to confirm account deletion.', 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownedFamilyMembers: {
        select: { memberUserId: true },
      },
    },
  })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Only patient accounts can be deleted.', 400)
  }

  for (const familyMember of user.ownedFamilyMembers) {
    await permanentlyDeleteUser(familyMember.memberUserId)
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_DELETE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'PatientAccount',
    resourceId: userId,
  })
  await permanentlyDeleteUser(userId)
}
