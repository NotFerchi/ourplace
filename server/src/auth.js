import jwt from 'jsonwebtoken'

const COOKIE = 'mp_session'
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30 // 30 días
const isProd = process.env.NODE_ENV === 'production'
const secret = () => process.env.JWT_SECRET || 'dev-only-secret-no-usar-en-produccion'

export function setSession(res, userId) {
  const token = jwt.sign({ sub: userId }, secret(), { expiresIn: '30d' })
  res.cookie(COOKIE, token, {
    httpOnly: true, // el JavaScript de la página no puede leerla
    sameSite: 'lax',
    secure: isProd,
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' })
}

/** Devuelve el id del usuario de la cookie, o null si no hay sesión válida. */
export function readSession(req) {
  const token = req.cookies?.[COOKIE]
  if (!token) return null
  try {
    return jwt.verify(token, secret()).sub ?? null
  } catch {
    return null
  }
}

export function requireAuth(req, res, next) {
  const userId = readSession(req)
  if (!userId) return res.status(401).json({ error: 'Inicia sesión' })
  req.userId = userId
  next()
}
