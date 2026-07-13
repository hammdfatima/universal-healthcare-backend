import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const PREFIX = 'enc:v1:'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyB64 = Bun.env.PHI_ENCRYPTION_KEY

  if (!keyB64) {
    throw new Error('PHI_ENCRYPTION_KEY is not configured')
  }

  const key = Buffer.from(keyB64, 'base64')

  if (key.length !== 32) {
    throw new Error('PHI_ENCRYPTION_KEY must be a 32-byte base64-encoded key')
  }

  return key
}

export function isEncryptedPhi(value: string): boolean {
  return value.startsWith(PREFIX)
}

export function encryptPhi(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptPhi(value: string): string {
  if (!isEncryptedPhi(value)) {
    return value
  }

  const payload = value.slice(PREFIX.length)
  const [ivB64, tagB64, ciphertextB64] = payload.split(':')

  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Invalid encrypted PHI payload')
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivB64, 'base64'),
    { authTagLength: AUTH_TAG_LENGTH }
  )
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function encryptPhiNullable(value: string | null | undefined): string | null {
  if (value == null || value === '') {
    return value ?? null
  }

  if (isEncryptedPhi(value)) {
    return value
  }

  return encryptPhi(value)
}

export function decryptPhiNullable(value: string | null | undefined): string | null {
  if (value == null || value === '') {
    return value ?? null
  }

  return decryptPhi(value)
}

export function encryptPhiRequired(value: string): string {
  if (isEncryptedPhi(value)) {
    return value
  }

  return encryptPhi(value)
}

export function encryptStringArray(values: string[]): string[] {
  return values.map(value => encryptPhiRequired(value))
}

export function decryptStringArray(values: string[]): string[] {
  return values.map(value => decryptPhi(value))
}

export function encryptDateToPhi(date: Date): string {
  return encryptPhi(date.toISOString())
}

export function decryptPhiToDate(value: string): Date {
  const iso = decryptPhi(value)
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid encrypted date value')
  }

  return date
}

export function encryptDateNullable(date: Date | null | undefined): string | null {
  if (!date) {
    return null
  }

  return encryptDateToPhi(date)
}

export function decryptDateNullable(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  return decryptPhiToDate(value)
}
