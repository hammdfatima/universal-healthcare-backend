import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import {
  getSharingRecipients,
  getSidebarFamilyMembers,
  reciprocalRelationship,
} from '~/lib/household'
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

async function getSharedPetCountsForViewer(viewerUserId: string, candidateOwnerIds: string[]) {
  if (candidateOwnerIds.length === 0) {
    return new Map<string, number>()
  }

  const shares = await prisma.petShare.findMany({
    where: {
      granteeUserId: viewerUserId,
      pet: {
        ownerId: { in: candidateOwnerIds },
        owner: {
          subscription: {
            is: {
              status: { in: ['active', 'trialing'] },
              subscriptionPlan: { allowsPets: true },
            },
          },
        },
      },
    },
    select: {
      pet: { select: { ownerId: true } },
    },
  })

  const counts = new Map<string, number>()
  for (const share of shares) {
    counts.set(share.pet.ownerId, (counts.get(share.pet.ownerId) ?? 0) + 1)
  }
  return counts
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      managedByOwnerId: true,
      familyMemberProfile: {
        select: {
          relationship: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              medicalRecordShareWithAll: true,
              medicalRecordSharesOwned: {
                where: { granteeUserId: userId },
                select: { id: true },
                take: 1,
              },
              subscription: {
                select: {
                  status: true,
                  subscriptionPlan: { select: { allowsPets: true } },
                },
              },
              ownedPets: {
                where: {
                  shares: { some: { granteeUserId: userId } },
                },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  // Managed accounts only need the owner who added them. Resolve everything
  // in the query above instead of traversing the household through several
  // sequential remote DB calls.
  if (user.managedByOwnerId && user.familyMemberProfile) {
    const { owner, relationship } = user.familyMemberProfile
    const petsEnabled =
      Boolean(owner.subscription?.subscriptionPlan.allowsPets) &&
      (owner.subscription?.status === 'active' ||
        owner.subscription?.status === 'trialing')

    return {
      isManagedMember: true,
      canManageFamily: false,
      members: [
        {
          userId: owner.id,
          firstName: decryptPhiNullable(owner.firstName) ?? '',
          lastName: decryptPhiNullable(owner.lastName) ?? '',
          email: owner.email,
          relationship: reciprocalRelationship(relationship),
          isAccountOwner: true,
          hasSharedRecordsWithMe:
            owner.medicalRecordShareWithAll ||
            owner.medicalRecordSharesOwned.length > 0,
          sharedPetCount: petsEnabled ? owner.ownedPets.length : 0,
        },
      ],
    }
  }

  await assertPatientUser(userId)
  const members = await getSidebarFamilyMembers(userId)
  const candidateOwnerIds = members.map(member => member.userId)
  const [sharedIds, sharedPetCounts] = await Promise.all([
    getSharedOwnerIdsForViewer(userId, candidateOwnerIds),
    getSharedPetCountsForViewer(userId, candidateOwnerIds),
  ])

  return {
    isManagedMember: Boolean(user.managedByOwnerId),
    canManageFamily: !user.managedByOwnerId,
    members: members.map(member => ({
      ...member,
      hasSharedRecordsWithMe: sharedIds.has(member.userId),
      sharedPetCount: sharedPetCounts.get(member.userId) ?? 0,
    })),
  }
}

export async function listAccessiblePatients(userId: string) {
  const [, self, sidebar] = await Promise.all([
    assertPatientUser(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
    listSidebarFamily(userId),
  ])

  if (!self) {
    throw new HttpError('User not found.', 404)
  }

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
