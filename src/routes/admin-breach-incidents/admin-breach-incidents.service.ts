import type { BreachIncident, BreachStatus } from '~/generated/prisma'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

type CreateBreachIncidentInput = {
  title: string
  summary: string
  status?: BreachStatus
  affectedCountEst?: number
  dataCategories?: string[]
  detectedAt?: string
  hipaa60dDeadline?: string
}

type UpdateBreachIncidentInput = {
  title?: string
  summary?: string
  status?: BreachStatus
  affectedCountEst?: number
  dataCategories?: string[]
  hipaa60dDeadline?: string
}

function toBreachIncidentResponse(record: BreachIncident) {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    status: record.status,
    affectedCountEst: record.affectedCountEst,
    dataCategories: record.dataCategories,
    detectedAt: record.detectedAt.toISOString(),
    hipaa60dDeadline: record.hipaa60dDeadline.toISOString(),
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

// HIPAA Breach Notification Rule (45 CFR §164.408): notify within 60 days of discovery.
export async function listBreachIncidents() {
  const incidents = await prisma.breachIncident.findMany({
    orderBy: { detectedAt: 'desc' },
  })

  return { incidents: incidents.map(toBreachIncidentResponse) }
}

export async function createBreachIncident(
  actorUserId: string,
  input: CreateBreachIncidentInput
) {
  const detectedAt = input.detectedAt ? new Date(input.detectedAt) : new Date()
  const hipaa60dDeadline = input.hipaa60dDeadline
    ? new Date(input.hipaa60dDeadline)
    : new Date(detectedAt.getTime() + SIXTY_DAYS_MS)

  const record = await prisma.breachIncident.create({
    data: {
      title: input.title,
      summary: input.summary,
      status: input.status ?? 'open',
      affectedCountEst: input.affectedCountEst ?? 0,
      dataCategories: input.dataCategories ?? [],
      detectedAt,
      hipaa60dDeadline,
      createdByUserId: actorUserId,
    },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.BREACH_INCIDENT_CREATED,
    actorUserId,
    resourceType: 'BreachIncident',
    resourceId: record.id,
    metadata: { title: record.title, status: record.status },
  })

  return toBreachIncidentResponse(record)
}

export async function updateBreachIncident(
  actorUserId: string,
  id: string,
  input: UpdateBreachIncidentInput
) {
  const existing = await prisma.breachIncident.findUnique({ where: { id } })
  if (!existing) {
    throw new HttpError('Breach incident not found.', 404)
  }

  const record = await prisma.breachIncident.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.affectedCountEst !== undefined
        ? { affectedCountEst: input.affectedCountEst }
        : {}),
      ...(input.dataCategories !== undefined
        ? { dataCategories: input.dataCategories }
        : {}),
      ...(input.hipaa60dDeadline !== undefined
        ? { hipaa60dDeadline: new Date(input.hipaa60dDeadline) }
        : {}),
    },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.BREACH_INCIDENT_UPDATED,
    actorUserId,
    resourceType: 'BreachIncident',
    resourceId: record.id,
    metadata: { status: record.status },
  })

  return toBreachIncidentResponse(record)
}

export async function deleteBreachIncident(actorUserId: string, id: string) {
  const existing = await prisma.breachIncident.findUnique({ where: { id } })
  if (!existing) {
    throw new HttpError('Breach incident not found.', 404)
  }

  await prisma.breachIncident.delete({ where: { id } })

  await writeAuditLog({
    action: AUDIT_ACTIONS.BREACH_INCIDENT_DELETED,
    actorUserId,
    resourceType: 'BreachIncident',
    resourceId: id,
  })
}
