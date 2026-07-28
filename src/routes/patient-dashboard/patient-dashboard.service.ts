import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { decryptPhiToDate } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'

export async function getDashboardStats(userId: string) {
  await assertPatientUser(userId)

  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )

  const [medicationRecords, allergies, vaccinations, labResults, imagingResults] =
    await Promise.all([
      prisma.medication.findMany({
        where: { userId },
        select: { endDate: true },
      }),
      prisma.allergy.count({ where: { userId } }),
      prisma.vaccination.count({ where: { userId } }),
      prisma.labResult.count({ where: { userId } }),
      prisma.imagingResult.count({ where: { userId } }),
    ])

  const medications = medicationRecords.filter(record => {
    if (!record.endDate) {
      return true
    }

    return decryptPhiToDate(record.endDate) >= todayUtc
  }).length

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
