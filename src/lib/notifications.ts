import type { NotificationType } from '~/generated/prisma'
import { decryptPhi } from '~/lib/phi-crypto'
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

/** `timezoneOffsetMinutes` matches `Date.getTimezoneOffset()` (minutes to add to local to get UTC). */
function getLocalClock(now: Date, timezoneOffsetMinutes: number) {
  const local = new Date(now.getTime() - timezoneOffsetMinutes * 60_000)

  return {
    dayKey: formatUtcDayKey(local),
    minutesOfDay: local.getUTCHours() * 60 + local.getUTCMinutes(),
    localDate: startOfUtcDay(local),
  }
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!match) {
    return null
  }

  return Number(match[1]) * 60 + Number(match[2])
}

function formatDoseTimeLabel(value: string): string {
  const minutes = parseTimeToMinutes(value)
  if (minutes === null) {
    return value
  }

  const hours24 = Math.floor(minutes / 60)
  const mins = minutes % 60
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12

  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`
}

const DEFAULT_DOSE_SCHEDULES: Record<number, string[]> = {
  1: ['08:00'],
  2: ['08:00', '20:00'],
  3: ['08:00', '14:00', '20:00'],
  4: ['08:00', '12:00', '18:00', '22:00'],
  5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
  6: ['08:00', '10:00', '12:00', '14:00', '16:00', '20:00'],
}

function resolveDoseTimes(timesPerDay: number, timesOfDay: string[]): string[] {
  const cleaned = timesOfDay.map(time => time.trim()).filter(Boolean)
  if (cleaned.length > 0) {
    return cleaned
  }

  return DEFAULT_DOSE_SCHEDULES[timesPerDay] ?? DEFAULT_DOSE_SCHEDULES[1]
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

export async function syncScheduledNotifications(
  userId: string,
  timezoneOffsetMinutes = 0
) {
  if (!(await userAllowsInAppNotifications(userId))) {
    return
  }

  const now = new Date()
  const todayUtc = startOfUtcDay(now)
  const localClock = getLocalClock(now, timezoneOffsetMinutes)

  const [medications, vaccinations] = await Promise.all([
    prisma.medication.findMany({ where: { userId } }),
    prisma.vaccination.findMany({ where: { userId } }),
  ])

  for (const medication of medications) {
    const startDate = startOfUtcDay(medication.startDate)
    const endDate = medication.endDate ? startOfUtcDay(medication.endDate) : null
    const isActive =
      startDate <= localClock.localDate && (!endDate || endDate >= localClock.localDate)

    if (!isActive) {
      continue
    }

    const doseTimes = resolveDoseTimes(medication.timesPerDay, medication.timesOfDay)
    const medicineName = decryptPhi(medication.medicineName)
    const dosage = decryptPhi(medication.dosage)

    for (const doseTime of doseTimes) {
      const scheduledMinutes = parseTimeToMinutes(doseTime)
      if (scheduledMinutes === null) {
        continue
      }

      // Create once the local clock reaches this dose time (exact minute or later).
      // Client-side timers call this sync at the exact second for on-time delivery.
      if (localClock.minutesOfDay < scheduledMinutes) {
        continue
      }

      const timeLabel = formatDoseTimeLabel(doseTime)

      await createNotification({
        userId,
        type: 'medication',
        title: `Time for your ${timeLabel} dose`,
        message: `It's ${timeLabel} — take ${medicineName} (${dosage}).`,
        href: '/patient/health-record?tab=medications',
        dedupeKey: `medication:dose:${medication.id}:${localClock.dayKey}:${doseTime}`,
      })
    }
  }

  for (const vaccination of vaccinations) {
    const nextDueDate = addUtcYears(startOfUtcDay(vaccination.vaccinationDate), 1)
    const daysUntilDue = daysBetweenUtc(todayUtc, nextDueDate)

    if (daysUntilDue < 0) {
      await createNotification({
        userId,
        type: 'vaccination',
        title: 'Vaccination overdue',
        message: `Your ${decryptPhi(vaccination.vaccineName)} booster is overdue.`,
        href: '/patient/health-record',
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
        message: `Your ${decryptPhi(vaccination.vaccineName)} booster is due ${dayLabel}.`,
        href: '/patient/health-record?tab=immunizations',
        dedupeKey: `vaccination:due:${vaccination.id}:${daysUntilDue}`,
      })
    }
  }
}

export async function listNotifications(
  userId: string,
  timezoneOffsetMinutes = 0
) {
  await syncScheduledNotifications(userId, timezoneOffsetMinutes)

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
    href: '/patient/health-record',
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
    href: '/patient/health-record',
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
    href: '/patient/health-record?tab=immunizations',
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
