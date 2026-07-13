import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import prisma from '~/lib/prisma'

function getActiveMedicationFilter() {
  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )

  return {
    OR: [{ endDate: null }, { endDate: { gte: todayUtc } }],
  }
}

export async function getDashboardStats(userId: string) {
  await assertPatientUser(userId)

  const [medications, allergies, vaccinations, labResults, imagingResults] = await Promise.all([
    prisma.medication.count({
      where: {
        userId,
        ...getActiveMedicationFilter(),
      },
    }),
    prisma.allergy.count({ where: { userId } }),
    prisma.vaccination.count({ where: { userId } }),
    prisma.labResult.count({ where: { userId } }),
    prisma.imagingResult.count({ where: { userId } }),
  ])
  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'PatientDashboard',
  })

  return {
    counts: {
      medications,
      allergies,
      vaccinations,
      documents: labResults + imagingResults,
      labResults,
      imagingResults,
    },
  }
}
