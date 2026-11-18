import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// Tokens de servicios externos cifrados con AES-256-GCM.
// Formato guardado: "v1:<iv>:<tag>:<cifrado>" (base64). La clave es TOKEN_ENC_KEY (32 bytes en hex).

/** Clave de cifrado, o null si TOKEN_ENC_KEY falta o no tiene 64 caracteres hex. */
export function tokenKey() {
  const hex = process.env.TOKEN_ENC_KEY ?? ''
  return /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, 'hex') : null
}

function requireKey() {
  const key = tokenKey()
  if (!key) throw Object.assign(new Error('Falta TOKEN_ENC_KEY en el servidor'), { status: 503, expose: true })
  return key
}

export function encryptToken(plain) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', requireKey(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':')
}

export function decryptToken(stored) {
  const [version, iv, tag, data] = stored.split(':')
  if (version !== 'v1') throw new Error('Formato de token desconocido')
  const decipher = createDecipheriv('aes-256-gcm', requireKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}
