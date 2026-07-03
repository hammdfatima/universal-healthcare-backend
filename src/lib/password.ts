import type { Password } from 'bun'

const PASSWORD_HASH_OPTIONS: Password.HashOptions = {
  algorithm: 'bcrypt',
  cost: 12,
}

export async function hashPassword(password: string) {
  return Bun.password.hash(password, PASSWORD_HASH_OPTIONS)
}

export async function verifyPassword(password: string, hash: string) {
  return Bun.password.verify(password, hash)
}
