import { tokenKey } from './crypto.js'
import { app } from './app.js'

const isProd = process.env.NODE_ENV === 'production'
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('Falta JWT_SECRET (mínimo 32 caracteres) en producción')
}
// Cifra los tokens de ClickUp y demás servicios conectados
if (!tokenKey()) {
  const msg = 'Falta TOKEN_ENC_KEY (32 bytes en hex, 64 caracteres)'
  if (isProd) throw new Error(`${msg} en producción`)
  console.warn(`${msg}: las conexiones con servicios externos no funcionarán.`)
}

const port = Number(process.env.PORT) || 3000
app.listen(port, () => console.log(`Our Place API escuchando en :${port}`))
