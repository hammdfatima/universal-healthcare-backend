import { assertPatientUser } from '~/lib/assert-patient'
import { AUDIT_ACTIONS, writeAuditLog } from '~/lib/audit'
import { decryptPhi, encryptPhiRequired } from '~/lib/phi-crypto'
import prisma from '~/lib/prisma'
import { resolveVaultPatientId } from '~/lib/vault-access'
import {
  familyConditionKeys,
  substanceKeys,
  type familyConditionEntrySchema,
  type substanceEntrySchema,
} from '~/routes/family-lifestyle-history/family-lifestyle-history.schemas'
import type { z } from 'zod'

type SubstanceEntry = z.infer<typeof substanceEntrySchema>
type FamilyConditionEntry = z.infer<typeof familyConditionEntrySchema>

type FamilyLifestyleHistoryInput = {
  substances: SubstanceEntry[]
  familyHistory: FamilyConditionEntry[]
}

function createDefaultSubstances(): SubstanceEntry[] {
  return substanceKeys.map(id => ({
    id,
    currentlyUsing: false,
    previouslyUsing: false,
    typeAmount: '',
    durationYears: 1,
    stoppedYear: '',
  }))
}

function createDefaultFamilyHistory(): FamilyConditionEntry[] {
  return familyConditionKeys.map(id => ({
    id,
    relations: {
      grandparents: false,
      father: false,
      mother: false,
      brothers: false,
      sisters: false,
      sons: false,
      daughters: false,
    },
    details: '',
  }))
}

export function createDefaultFamilyLifestyleHistory() {
  return {
    substances: createDefaultSubstances(),
    familyHistory: createDefaultFamilyHistory(),
    updatedAt: null as string | null,
  }
}

function encryptJson(value: unknown) {
  return encryptPhiRequired(JSON.stringify(value))
}

function decryptJson<T>(value: string): T {
  return JSON.parse(decryptPhi(value)) as T
}

function toFamilyLifestyleHistoryResponse(record: {
  substancesData: string
  familyHistoryData: string
  updatedAt: Date
}) {
  return {
    substances: decryptJson<SubstanceEntry[]>(record.substancesData),
    familyHistory: decryptJson<FamilyConditionEntry[]>(record.familyHistoryData),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export async function getFamilyLifestyleHistory(
  actorUserId: string,
  requestedPatientUserId?: string | null
) {
  const userId = await resolveVaultPatientId(actorUserId, requestedPatientUserId)

  const record = await prisma.familyLifestyleHistory.findUnique({
    where: { userId },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_READ,
    actorUserId,
    patientUserId: userId,
    resourceType: 'FamilyLifestyleHistory',
    resourceId: record?.id ?? userId,
  })

  if (!record) {
    return {
      familyLifestyleHistory: createDefaultFamilyLifestyleHistory(),
    }
  }

  return {
    familyLifestyleHistory: toFamilyLifestyleHistoryResponse(record),
  }
}

export async function upsertFamilyLifestyleHistory(
  userId: string,
  input: FamilyLifestyleHistoryInput
) {
  await assertPatientUser(userId)

  const record = await prisma.familyLifestyleHistory.upsert({
    where: { userId },
    create: {
      userId,
      substancesData: encryptJson(input.substances),
      familyHistoryData: encryptJson(input.familyHistory),
    },
    update: {
      substancesData: encryptJson(input.substances),
      familyHistoryData: encryptJson(input.familyHistory),
    },
  })

  await writeAuditLog({
    action: AUDIT_ACTIONS.PHI_UPDATE,
    actorUserId: userId,
    patientUserId: userId,
    resourceType: 'FamilyLifestyleHistory',
    resourceId: record.id,
  })

  return {
    familyLifestyleHistory: toFamilyLifestyleHistoryResponse(record),
  }
}

export function formatFamilyLifestyleHistoryForExport(record: {
  substancesData: string
  familyHistoryData: string
  updatedAt: Date
} | null) {
  if (!record) {
    return createDefaultFamilyLifestyleHistory()
  }

  return toFamilyLifestyleHistoryResponse(record)
}

export function countFamilyLifestyleHistoryEntries(data: {
  substances: SubstanceEntry[]
  familyHistory: FamilyConditionEntry[]
}) {
  const substanceCount = data.substances.filter(entry =>
    entry.currentlyUsing ||
    entry.previouslyUsing ||
    entry.typeAmount.trim() ||
    entry.stoppedYear.trim()
  ).length

  const familyCount = data.familyHistory.filter(entry =>
    entry.details.trim() ||
    Object.values(entry.relations).some(Boolean)
  ).length

  return substanceCount + familyCount
}
