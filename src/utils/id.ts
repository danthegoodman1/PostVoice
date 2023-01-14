import * as nanoid from 'nanoid/non-secure'

export function randomID(prefix: string, length = 16) {
  return prefix + nanoid.customAlphabet('1234567890abcdefghijklmonpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', length)
}
