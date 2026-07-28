/**
 * One-time migration: encrypt existing plaintext PHI fields in place.
 * Safe to re-run — already-encrypted values (enc:v1:) are skipped.
 *
 * Usage (after prisma migrate):
 *   bun run scripts/encrypt-existing-phi.ts
 */
import { parseENV } from '../src/config/env'
import {
  encryptDateToPhi,
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
  if (values.length === 0) {
    return values
  }
  if (values.every(value => isEncryptedPhi(value))) {
    return values
  }
  return encryptStringArray(values)
}

function maybeEncryptDate(value: string | null | undefined) {
  if (value == null || value === '') {
    return value ?? null
  }
  if (isEncryptedPhi(value)) {
    return value
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    // Already a non-ISO string; encrypt as opaque text.
    return encryptPhiRequired(value)
  }
  return encryptDateToPhi(date)
}

await parseENV()

let usersUpdated = 0
const users = await prisma.user.findMany()
for (const user of users) {
  const data = {
    firstName: maybeEncrypt(user.firstName),
    lastName: maybeEncrypt(user.lastName),
    name: maybeEncrypt(user.name),
    phone: maybeEncrypt(user.phone),
    gender: maybeEncrypt(user.gender),
    bloodGroup: maybeEncrypt(user.bloodGroup),
    address: maybeEncrypt(user.address),
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
  const timesEncrypted = row.timesOfDay.every(value => isEncryptedPhi(value))
  const datesEncrypted =
    isEncryptedPhi(row.startDate) &&
    (row.endDate == null || isEncryptedPhi(row.endDate))
  if (isEncryptedPhi(row.medicineName) && timesEncrypted && datesEncrypted) {
    continue
  }
  await prisma.medication.update({
    where: { id: row.id },
    data: {
      medicineName: encryptPhiRequired(row.medicineName),
      condition: encryptPhiRequired(row.condition),
      prescribedBy: encryptPhiRequired(row.prescribedBy),
      dosage: encryptPhiRequired(row.dosage),
      timesOfDay: maybeEncryptArray(row.timesOfDay),
      startDate: maybeEncryptDate(row.startDate)!,
      endDate: maybeEncryptDate(row.endDate),
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
  if (isEncryptedPhi(row.illnessName) && isEncryptedPhi(row.diagnosisDate)) continue
  await prisma.healthHistoryEntry.update({
    where: { id: row.id },
    data: {
      illnessName: encryptPhiRequired(row.illnessName),
      diagnosisDate: maybeEncryptDate(row.diagnosisDate)!,
      prescribedBy: encryptPhiRequired(row.prescribedBy),
      details: encryptPhiRequired(row.details),
    },
  })
  healthHistoryUpdated += 1
}

const vaccinations = await prisma.vaccination.findMany()
let vaccinationsUpdated = 0
for (const row of vaccinations) {
  if (isEncryptedPhi(row.vaccineName) && isEncryptedPhi(row.vaccinationDate)) continue
  await prisma.vaccination.update({
    where: { id: row.id },
    data: {
      vaccineName: encryptPhiRequired(row.vaccineName),
      prescribedBy: encryptPhiRequired(row.prescribedBy),
      administeredBy: encryptPhiRequired(row.administeredBy),
      dosage: encryptPhiRequired(row.dosage),
      vaccinationDate: maybeEncryptDate(row.vaccinationDate)!,
      time: encryptPhiRequired(row.time),
    },
  })
  vaccinationsUpdated += 1
}

const labResults = await prisma.labResult.findMany()
let labResultsUpdated = 0
for (const row of labResults) {
  if (isEncryptedPhi(row.fileName) && isEncryptedPhi(row.testDate)) continue
  await prisma.labResult.update({
    where: { id: row.id },
    data: {
      fileName: encryptPhiRequired(row.fileName),
      testType: encryptPhiRequired(row.testType),
      testDate: maybeEncryptDate(row.testDate)!,
      fileUrl: encryptPhiRequired(row.fileUrl),
      filePublicId: encryptPhiRequired(row.filePublicId),
    },
  })
  labResultsUpdated += 1
}

const imagingResults = await prisma.imagingResult.findMany()
let imagingResultsUpdated = 0
for (const row of imagingResults) {
  if (isEncryptedPhi(row.fileName) && isEncryptedPhi(row.scanDate)) continue
  await prisma.imagingResult.update({
    where: { id: row.id },
    data: {
      fileName: encryptPhiRequired(row.fileName),
      testType: encryptPhiRequired(row.testType),
      scanType: encryptPhiRequired(row.scanType),
      scanDate: maybeEncryptDate(row.scanDate)!,
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

const pharmacies = await prisma.pharmacy.findMany()
let pharmaciesUpdated = 0
for (const row of pharmacies) {
  if (isEncryptedPhi(row.name)) continue
  await prisma.pharmacy.update({
    where: { id: row.id },
    data: {
      name: encryptPhiRequired(row.name),
      phone: encryptPhiRequired(row.phone),
      address: encryptPhiRequired(row.address),
      notes: encryptPhiNullable(row.notes),
    },
  })
  pharmaciesUpdated += 1
}

const lifestyle = await prisma.familyLifestyleHistory.findMany()
let lifestyleUpdated = 0
for (const row of lifestyle) {
  if (isEncryptedPhi(row.substancesData) && isEncryptedPhi(row.familyHistoryData)) {
    continue
  }
  await prisma.familyLifestyleHistory.update({
    where: { id: row.id },
    data: {
      substancesData: maybeEncrypt(row.substancesData)!,
      familyHistoryData: maybeEncrypt(row.familyHistoryData)!,
    },
  })
  lifestyleUpdated += 1
}

const pets = await prisma.pet.findMany()
let petsUpdated = 0
for (const row of pets) {
  if (isEncryptedPhi(row.name)) continue
  await prisma.pet.update({
    where: { id: row.id },
    data: {
      name: encryptPhiRequired(row.name),
      species: encryptPhiRequired(row.species),
      breed: encryptPhiNullable(row.breed),
      sex: encryptPhiNullable(row.sex),
      color: encryptPhiNullable(row.color),
      dateOfBirth: maybeEncryptDate(row.dateOfBirth),
      weight: encryptPhiNullable(row.weight),
      microchipId: encryptPhiNullable(row.microchipId),
      ownerName: encryptPhiNullable(row.ownerName),
      ownerPhone: encryptPhiNullable(row.ownerPhone),
      ownerEmail: encryptPhiNullable(row.ownerEmail),
      veterinaryClinic: encryptPhiNullable(row.veterinaryClinic),
      veterinaryPhone: encryptPhiNullable(row.veterinaryPhone),
      veterinaryRecords: encryptPhiNullable(row.veterinaryRecords),
      additionalNotes: encryptPhiNullable(row.additionalNotes),
      allergiesJson: maybeEncrypt(row.allergiesJson),
      medicationsJson: maybeEncrypt(row.medicationsJson),
      medicalConditionsJson: maybeEncrypt(row.medicalConditionsJson),
      vaccinationsJson: maybeEncrypt(row.vaccinationsJson),
    },
  })
  petsUpdated += 1
}

const notifications = await prisma.notification.findMany()
let notificationsUpdated = 0
for (const row of notifications) {
  if (isEncryptedPhi(row.title) && isEncryptedPhi(row.message)) continue
  await prisma.notification.update({
    where: { id: row.id },
    data: {
      title: encryptPhiRequired(row.title),
      message: encryptPhiRequired(row.message),
    },
  })
  notificationsUpdated += 1
}

const userQueries = await prisma.userQuery.findMany()
let userQueriesUpdated = 0
for (const row of userQueries) {
  if (isEncryptedPhi(row.fullName) && isEncryptedPhi(row.message)) continue
  await prisma.userQuery.update({
    where: { id: row.id },
    data: {
      fullName: encryptPhiRequired(row.fullName),
      message: encryptPhiRequired(row.message),
      reply: encryptPhiNullable(row.reply),
    },
  })
  userQueriesUpdated += 1
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
      pharmaciesUpdated,
      lifestyleUpdated,
      petsUpdated,
      notificationsUpdated,
      userQueriesUpdated,
    },
    null,
    2
  )
)

await prisma.$disconnect()
