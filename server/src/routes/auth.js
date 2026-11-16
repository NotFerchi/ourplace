import { timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { clearSession, readSession, setSession } from '../auth.js'
import { prisma } from '../db.js'

const router = Router()

// Frena la fuerza bruta: 20 intentos cada 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos.' },
})

const email = z.string().trim().toLowerCase().max(160).pipe(z.email('Correo no válido'))
const registerSchema = z.object({
  name: z.string().trim().min(1, 'Escribe tu nombre').max(40),
  email,
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres').max(100),
  inviteCode: z.string().max(100).default(''),
})
const loginSchema = z.object({ email, password: z.string().min(1).max(100) })

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email })
const firstIssue = (err) => err.issues?.[0]?.message ?? 'Datos no válidos'

function inviteOk(given) {
  const expected = process.env.INVITE_CODE
  if (!expected) return true // sin INVITE_CODE el registro es abierto
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Hash de relleno: login tarda lo mismo exista o no el correo
const DUMMY_HASH = bcrypt.hashSync('relleno-para-igualar-tiempos', 10)

// El cliente pregunta si debe mostrar el campo de código de invitación
router.get('/config', (_req, res) => {
  res.json({ inviteRequired: Boolean(process.env.INVITE_CODE) })
})

router.post('/register', limiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error) })
  const { name, email: mail, password, inviteCode } = parsed.data

  if (!inviteOk(inviteCode)) return res.status(403).json({ error: 'Código de invitación incorrecto' })
  if (await prisma.user.findUnique({ where: { email: mail } })) {
    return res.status(409).json({ error: 'Ese correo ya tiene una cuenta' })
  }

  const user = await prisma.user.create({
    data: { name, email: mail, passwordHash: await bcrypt.hash(password, 10) },
  })
  setSession(res, user.id)
  res.status(201).json({ user: publicUser(user) })
})

router.post('/login', limiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Correo o contraseña incorrectos' })
  const { email: mail, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email: mail } })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' })

  setSession(res, user.id)
  res.json({ user: publicUser(user) })
})

router.post('/logout', (_req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

router.get('/me', async (req, res) => {
  const userId = readSession(req)
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null
  if (!user) return res.status(401).json({ error: 'Sin sesión' })
  res.json({ user: publicUser(user) })
})

export default router
