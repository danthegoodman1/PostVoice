import crypto from 'crypto'

/**
 * @returns hex encoded string
 */
export function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16)
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  console.log(iv.toString('hex'))
  return Buffer.concat([iv, encrypted]).toString('hex')
}

export function decrypt(hex: string, key: string) {
  const iv = Buffer.from(hex.substring(0, 32), 'hex')
  const encData = Buffer.from(hex.substring(32), 'hex')

  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv)
  let decrypted = decipher.update(encData)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}
