import { USER_ROLES } from '~/config/roles'
import { HttpError } from '~/lib/error'
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

async function assertPatientUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  return user
}

export async function getDashboardStats(userId: string) {
  await assertPatientUser(userId)

  const [
    medications,
    allergies,
    vaccinations,
    labResults,
    imagingResults,
  ] = await Promise.all([
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
