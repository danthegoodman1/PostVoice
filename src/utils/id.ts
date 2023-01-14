import { customAlphabet } from 'nanoid/non-secure'

const nanoid = customAlphabet('1234567890abcdefghijklmonpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')

export function randomID(prefix: string, length = 16) {
  return prefix + nanoid(length)
}
