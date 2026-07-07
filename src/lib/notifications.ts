import type { NotificationType } from '~/generated/prisma'
import prisma from '~/lib/prisma'

type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  href?: string
  dedupeKey?: string
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcYears(date: Date, years: number) {
  const next = new Date(date)
  next.setUTCFullYear(next.getUTCFullYear() + years)
  return next
}

function formatUtcDayKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}${month}${day}`
}

function daysBetweenUtc(start: Date, end: Date) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((startOfUtcDay(end).getTime() - startOfUtcDay(start).getTime()) / msPerDay)
}

export function toNotificationResponse(notification: {
  id: string
  type: NotificationType
  title: string
  message: string
  href: string | null
  read: boolean
  createdAt: Date
}) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    href: notification.href,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  }
}

async function userAllowsInAppNotifications(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inAppNotifications: true },
  })

  return user?.inAppNotifications ?? true
}

export async function createNotification(input: CreateNotificationInput) {
  if (!(await userAllowsInAppNotifications(input.userId))) {
    return null
  }

  if (input.dedupeKey) {
    const existing = await prisma.notification.findUnique({
      where: {
        userId_dedupeKey: {
          userId: input.userId,
          dedupeKey: input.dedupeKey,
        },
      },
    })

    if (existing) {
      return existing
    }
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
      dedupeKey: input.dedupeKey ?? null,
    },
  })
}

export async function syncScheduledNotifications(userId: string) {
  if (!(await userAllowsInAppNotifications(userId))) {
    return
  }

  const today = startOfUtcDay(new Date())
  const todayKey = formatUtcDayKey(today)

  const [medications, vaccinations] = await Promise.all([
    prisma.medication.findMany({ where: { userId } }),
    prisma.vaccination.findMany({ where: { userId } }),
  ])

  for (const medication of medications) {
    const startDate = startOfUtcDay(medication.startDate)
    const endDate = medication.endDate ? startOfUtcDay(medication.endDate) : null
    const isActive = startDate <= today && (!endDate || endDate >= today)

    if (!isActive) {
      continue
    }

    await createNotification({
      userId,
      type: 'medication',
      title: 'Medication reminder',
      message: `Time to take ${medication.medicineName} (${medication.dosage}).`,
      href: '/patient/medications',
      dedupeKey: `medication:refill:${medication.id}:${todayKey}`,
    })
  }

  for (const vaccination of vaccinations) {
    const nextDueDate = addUtcYears(startOfUtcDay(vaccination.vaccinationDate), 1)
    const daysUntilDue = daysBetweenUtc(today, nextDueDate)

    if (daysUntilDue < 0) {
      await createNotification({
        userId,
        type: 'vaccination',
        title: 'Vaccination overdue',
        message: `Your ${vaccination.vaccineName} booster is overdue.`,
        href: '/patient/vaccinations',
        dedupeKey: `vaccination:overdue:${vaccination.id}`,
      })
      continue
    }

    if (daysUntilDue === 30 || daysUntilDue === 7 || daysUntilDue === 1) {
      const dayLabel = daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`

      await createNotification({
        userId,
        type: 'vaccination',
        title: 'Vaccination due soon',
        message: `Your ${vaccination.vaccineName} booster is due ${dayLabel}.`,
        href: '/patient/vaccinations',
        dedupeKey: `vaccination:due:${vaccination.id}:${daysUntilDue}`,
      })
    }
  }
}

export async function listNotifications(userId: string) {
  await syncScheduledNotifications(userId)

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return {
    notifications: notifications.map(toNotificationResponse),
    unreadCount: await prisma.notification.count({
      where: { userId, read: false },
    }),
  }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  })

  if (!notification) {
    return null
  }

  if (notification.read) {
    return toNotificationResponse(notification)
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })

  return toNotificationResponse(updated)
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: { read: true },
  })

  return listNotifications(userId)
}

export async function notifyMedicationAdded(
  userId: string,
  medication: { id: string; medicineName: string; dosage: string }
) {
  await createNotification({
    userId,
    type: 'medication',
    title: 'Medication added',
    message: `${medication.medicineName} (${medication.dosage}) was added to your records.`,
    href: '/patient/medications',
    dedupeKey: `medication:added:${medication.id}`,
  })
}

export async function notifyMedicationDiscontinued(
  userId: string,
  medication: { id: string; medicineName: string }
) {
  await createNotification({
    userId,
    type: 'medication',
    title: 'Medication discontinued',
    message: `${medication.medicineName} was marked as discontinued.`,
    href: '/patient/medications',
    dedupeKey: `medication:discontinued:${medication.id}:${Date.now()}`,
  })
}

export async function notifyVaccinationAdded(
  userId: string,
  vaccination: { id: string; vaccineName: string }
) {
  await createNotification({
    userId,
    type: 'vaccination',
    title: 'Vaccination recorded',
    message: `${vaccination.vaccineName} was added to your vaccination history.`,
    href: '/patient/vaccinations',
    dedupeKey: `vaccination:added:${vaccination.id}`,
  })
}

export async function notifyLabResultUploaded(
  userId: string,
  labResult: { id: string; testType: string; fileName: string }
) {
  await createNotification({
    userId,
    type: 'lab',
    title: 'New lab result uploaded',
    message: `${labResult.testType} (${labResult.fileName}) is ready to review.`,
    href: `/patient/lab/${labResult.id}/edit`,
    dedupeKey: `lab:uploaded:${labResult.id}`,
  })
}

export async function notifyImagingResultUploaded(
  userId: string,
  imagingResult: { id: string; testType: string; fileName: string }
) {
  await createNotification({
    userId,
    type: 'imaging',
    title: 'New imaging result uploaded',
    message: `${imagingResult.testType} (${imagingResult.fileName}) is ready to review.`,
    href: `/patient/imaging/${imagingResult.id}/edit`,
    dedupeKey: `imaging:uploaded:${imagingResult.id}`,
  })
}

export async function notifyCareProviderAdded(
  userId: string,
  provider: { id: string; name: string }
) {
  await createNotification({
    userId,
    type: 'provider',
    title: 'Care provider added',
    message: `${provider.name} was added to your care team.`,
    href: '/patient/provider',
    dedupeKey: `provider:added:${provider.id}`,
  })
}

export async function notifyCareProviderUpdated(
  userId: string,
  provider: { id: string; name: string }
) {
  await createNotification({
    userId,
    type: 'provider',
    title: 'Care provider updated',
    message: `Details for ${provider.name} were updated.`,
    href: '/patient/provider',
    dedupeKey: `provider:updated:${provider.id}:${Date.now()}`,
  })
}

export async function notifyCareProviderRemoved(
  userId: string,
  provider: { id: string; name: string }
) {
  await createNotification({
    userId,
    type: 'provider',
    title: 'Care provider removed',
    message: `${provider.name} was removed from your care team.`,
    href: '/patient/provider',
    dedupeKey: `provider:removed:${provider.id}:${Date.now()}`,
  })
}

export async function notifySignIn(
  userId: string,
  input: {
    formattedTime: string
    locationHint: string
    dedupeKey: string
  }
) {
  await createNotification({
    userId,
    type: 'system',
    title: 'New sign-in',
    message: `Your account was signed in on ${input.formattedTime}${input.locationHint}.`,
    href: '/patient/settings?tab=account',
    dedupeKey: input.dedupeKey,
  })
}
