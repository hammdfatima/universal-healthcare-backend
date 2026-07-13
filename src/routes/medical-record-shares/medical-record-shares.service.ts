import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import { getSharingRecipients, getSidebarFamilyMembers } from '~/lib/household'
import { decryptPhiNullable } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'

async function getSharedOwnerIdsForViewer(viewerUserId: string, candidateOwnerIds: string[]) {
  if (candidateOwnerIds.length === 0) {
    return new Set<string>()
  }

  const [owners, shares] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: candidateOwnerIds } },
      select: { id: true, medicalRecordShareWithAll: true },
    }),
    prisma.medicalRecordShare.findMany({
      where: {
        ownerUserId: { in: candidateOwnerIds },
        granteeUserId: viewerUserId,
      },
      select: { ownerUserId: true },
    }),
  ])

  const sharedIds = new Set(
    owners.filter(owner => owner.medicalRecordShareWithAll).map(owner => owner.id)
  )

  for (const share of shares) {
    sharedIds.add(share.ownerUserId)
  }

  return sharedIds
}

export async function getSharingSettings(userId: string) {
  await assertPatientUser(userId)

  const [user, recipients, shares] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        medicalRecordShareWithAll: true,
        managedByOwnerId: true,
      },
    }),
    getSharingRecipients(userId),
    prisma.medicalRecordShare.findMany({
      where: { ownerUserId: userId },
      select: { granteeUserId: true },
    }),
  ])

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  const sharedIds = new Set(shares.map(share => share.granteeUserId))
  const isManagedMember = Boolean(user.managedByOwnerId)

  return {
    shareWithAll: user.medicalRecordShareWithAll,
    isManagedMember,
    members: recipients.map(member => ({
      ...member,
      isSharedWith: user.medicalRecordShareWithAll || sharedIds.has(member.userId),
    })),
  }
}

export async function updateSharingSettings(
  userId: string,
  input: { shareWithAll: boolean; granteeUserIds: string[] }
) {
  await assertPatientUser(userId)

  const recipients = await getSharingRecipients(userId)
  const allowedIds = new Set(recipients.map(member => member.userId))

  if (input.shareWithAll) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { medicalRecordShareWithAll: true },
      }),
      prisma.medicalRecordShare.deleteMany({
        where: { ownerUserId: userId },
      }),
    ])
  } else {
    const uniqueGrantees = [...new Set(input.granteeUserIds)].filter(id => id !== userId)

    for (const granteeUserId of uniqueGrantees) {
      if (!allowedIds.has(granteeUserId)) {
        throw new HttpError(
          'You can only share medical records with members of your household.',
          400
        )
      }
    }

    await prisma.$transaction(async tx => {
      await tx.user.update({
        where: { id: userId },
        data: { medicalRecordShareWithAll: false },
      })

      await tx.medicalRecordShare.deleteMany({
        where: { ownerUserId: userId },
      })

      if (uniqueGrantees.length > 0) {
        await tx.medicalRecordShare.createMany({
          data: uniqueGrantees.map(granteeUserId => ({
            ownerUserId: userId,
            granteeUserId,
          })),
        })
      }
    })
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'MedicalRecordShare',
    metadata: {
      shareWithAll: input.shareWithAll,
      granteeCount: input.shareWithAll ? recipients.length : input.granteeUserIds.length,
    },
  })

  return getSharingSettings(userId)
}

export async function listSidebarFamily(userId: string) {
  await assertPatientUser(userId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { managedByOwnerId: true },
  })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  const members = await getSidebarFamilyMembers(userId)
  const sharedIds = await getSharedOwnerIdsForViewer(
    userId,
    members.map(member => member.userId)
  )

  return {
    isManagedMember: Boolean(user.managedByOwnerId),
    canManageFamily: !user.managedByOwnerId,
    members: members.map(member => ({
      ...member,
      hasSharedRecordsWithMe: sharedIds.has(member.userId),
    })),
  }
}

export async function listAccessiblePatients(userId: string) {
  await assertPatientUser(userId)

  const self = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  })

  if (!self) {
    throw new HttpError('User not found.', 404)
  }

  const sidebar = await listSidebarFamily(userId)

  return {
    patients: [
      {
        userId: self.id,
        firstName: decryptPhiNullable(self.firstName) ?? '',
        lastName: decryptPhiNullable(self.lastName) ?? '',
        email: self.email,
        relationship: 'You',
        isSelf: true,
      },
      ...sidebar.members
        .filter(member => member.hasSharedRecordsWithMe)
        .map(member => ({
          userId: member.userId,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          relationship: member.relationship,
          isSelf: false,
        })),
    ],
  }
}
