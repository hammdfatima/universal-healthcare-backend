/**
 * One-time migration: encrypt existing plaintext PHI fields in place.
 * Safe to re-run — already-encrypted values (enc:v1:) are skipped.
 *
 * Usage: bun run scripts/encrypt-existing-phi.ts
 */
import { parseENV } from '../src/config/env'
import {
  encryptDateNullable,
  encryptPhiNullable,
  encryptPhiRequired,
  encryptStringArray,
  isEncryptedPhi,
} from '../src/lib/phi-crypto'
import prisma from '../src/lib/prisma'

function maybeEncrypt(value: string | null | undefined) {
  if (value == null || value === '') {
    return value ?? null
  }
  if (isEncryptedPhi(value)) {
    return value
  }
  return encryptPhiRequired(value)
}

function maybeEncryptArray(values: string[]) {
  if (values.every(value => isEncryptedPhi(value))) {
    return values
  }
  return encryptStringArray(values)
}

await parseENV()

let usersUpdated = 0
const users = await prisma.user.findMany()
for (const user of users) {
  const dateOfBirth =
    user.dateOfBirth && !isEncryptedPhi(user.dateOfBirth)
      ? encryptDateNullable(new Date(user.dateOfBirth))
      : user.dateOfBirth

  const data = {
    firstName: maybeEncrypt(user.firstName),
    lastName: maybeEncrypt(user.lastName),
    name: maybeEncrypt(user.name),
    phone: maybeEncrypt(user.phone),
    gender: maybeEncrypt(user.gender),
    bloodGroup: maybeEncrypt(user.bloodGroup),
    address: maybeEncrypt(user.address),
    dateOfBirth,
  }

  const changed = Object.entries(data).some(
    ([key, value]) => value !== (user as Record<string, unknown>)[key]
  )

  if (changed) {
    await prisma.user.update({ where: { id: user.id }, data })
    usersUpdated += 1
  }
}

const medications = await prisma.medication.findMany()
let medicationsUpdated = 0
for (const row of medications) {
  if (isEncryptedPhi(row.medicineName)) continue
  await prisma.medication.update({
    where: { id: row.id },
    data: {
      medicineName: encryptPhiRequired(row.medicineName),
      condition: encryptPhiRequired(row.condition),
      prescribedBy: encryptPhiRequired(row.prescribedBy),
      dosage: encryptPhiRequired(row.dosage),
    },
  })
  medicationsUpdated += 1
}

const allergies = await prisma.allergy.findMany()
let allergiesUpdated = 0
for (const row of allergies) {
  if (isEncryptedPhi(row.allergyType)) continue
  await prisma.allergy.update({
    where: { id: row.id },
    data: {
      allergyType: encryptPhiRequired(row.allergyType),
      nature: encryptPhiRequired(row.nature),
      symptoms: maybeEncryptArray(row.symptoms),
      triggers: maybeEncryptArray(row.triggers),
    },
  })
  allergiesUpdated += 1
}

const healthHistory = await prisma.healthHistoryEntry.findMany()
let healthHistoryUpdated = 0
for (const row of healthHistory) {
  if (isEncryptedPhi(row.illnessName)) continue
  await prisma.healthHistoryEntry.update({
    where: { id: row.id },
    data: {
      illnessName: encryptPhiRequired(row.illnessName),
      prescribedBy: encryptPhiRequired(row.prescribedBy),
      details: encryptPhiRequired(row.details),
    },
  })
  healthHistoryUpdated += 1
}

const vaccinations = await prisma.vaccination.findMany()
let vaccinationsUpdated = 0
for (const row of vaccinations) {
  if (isEncryptedPhi(row.vaccineName)) continue
  await prisma.vaccination.update({
    where: { id: row.id },
    data: {
      vaccineName: encryptPhiRequired(row.vaccineName),
      prescribedBy: encryptPhiRequired(row.prescribedBy),
      administeredBy: encryptPhiRequired(row.administeredBy),
      dosage: encryptPhiRequired(row.dosage),
      time: encryptPhiRequired(row.time),
    },
  })
  vaccinationsUpdated += 1
}

const labResults = await prisma.labResult.findMany()
let labResultsUpdated = 0
for (const row of labResults) {
  if (isEncryptedPhi(row.fileName)) continue
  await prisma.labResult.update({
    where: { id: row.id },
    data: {
      fileName: encryptPhiRequired(row.fileName),
      testType: encryptPhiRequired(row.testType),
      fileUrl: encryptPhiRequired(row.fileUrl),
      filePublicId: encryptPhiRequired(row.filePublicId),
    },
  })
  labResultsUpdated += 1
}

const imagingResults = await prisma.imagingResult.findMany()
let imagingResultsUpdated = 0
for (const row of imagingResults) {
  if (isEncryptedPhi(row.fileName)) continue
  await prisma.imagingResult.update({
    where: { id: row.id },
    data: {
      fileName: encryptPhiRequired(row.fileName),
      testType: encryptPhiRequired(row.testType),
      scanType: encryptPhiRequired(row.scanType),
      fileUrl: encryptPhiRequired(row.fileUrl),
      filePublicId: encryptPhiRequired(row.filePublicId),
    },
  })
  imagingResultsUpdated += 1
}

const careProviders = await prisma.careProvider.findMany()
let careProvidersUpdated = 0
for (const row of careProviders) {
  if (isEncryptedPhi(row.name)) continue
  await prisma.careProvider.update({
    where: { id: row.id },
    data: {
      name: encryptPhiRequired(row.name),
      phone: encryptPhiRequired(row.phone),
      email: encryptPhiNullable(row.email),
      clinicDetails: encryptPhiNullable(row.clinicDetails),
    },
  })
  careProvidersUpdated += 1
}

console.log(
  JSON.stringify(
    {
      usersUpdated,
      medicationsUpdated,
      allergiesUpdated,
      healthHistoryUpdated,
      vaccinationsUpdated,
      labResultsUpdated,
      imagingResultsUpdated,
      careProvidersUpdated,
    },
    null,
    2
  )
)

await prisma.$disconnect()
