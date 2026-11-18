import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { encryptToken } from '../crypto.js'
import { prisma } from '../db.js'
import { CONNECTORS, connectorFor } from '../integrations/index.js'
import { syncIntegration } from '../integrations/sync.js'

const router = Router()

// Por usuario (las rutas ya pasaron por requireAuth)
const limit = (max, message) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit: max,
    keyGenerator: (req) => req.userId,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message },
  })
const syncLimiter = limit(6, 'Demasiadas sincronizaciones. Espera un minuto.')
const writeLimiter = limit(20, 'Demasiados cambios seguidos. Espera un minuto.')

// Lo que el cliente puede ver de una conexión: nunca los tokens
const statusSelect = { provider: true, config: true, lastSyncAt: true, lastError: true, createdAt: true }

const putSchema = z.object({
  token: z.string().trim().min(1, 'Pega tu token').max(500, 'Ese token es demasiado largo').optional(),
  category: z.enum(['ESCUELA', 'PROYECTO', 'PERSONAL']).optional(),
})

const firstIssue = (err, fallback) => err.issues?.[0]?.message ?? fallback

function view(connector, row) {
  return {
    provider: connector.provider.toLowerCase(),
    label: connector.label,
    connected: Boolean(row),
    status: !row ? 'disconnected' : row.lastError ? 'error' : 'connected',
    lastSyncAt: row?.lastSyncAt ?? null,
    lastError: row?.lastError ?? null,
    category: row?.config?.category ?? connector.defaultCategory,
  }
}

async function listFor(userId) {
  const rows = await prisma.integration.findMany({ where: { userId }, select: statusSelect })
  return Object.values(CONNECTORS).map((c) => view(c, rows.find((r) => r.provider === c.provider)))
}

const keyOf = (req, connector) => ({ userId_provider: { userId: req.userId, provider: connector.provider } })

/** Resuelve :provider o responde 404. */
function withConnector(handler) {
  return (req, res) => {
    const connector = connectorFor(req.params.provider)
    if (!connector) return res.status(404).json({ error: 'Servicio no disponible' })
    return handler(req, res, connector)
  }
}

router.get('/', async (req, res) => {
  res.json({ integrations: await listFor(req.userId) })
})

router.post('/sync-all', syncLimiter, async (req, res) => {
  const rows = await prisma.integration.findMany({ where: { userId: req.userId } })
  const results = []
  for (const row of rows) {
    if (!CONNECTORS[row.provider]) continue
    results.push({ provider: row.provider.toLowerCase(), ...(await syncIntegration(row)) })
  }
  res.json({ results, integrations: await listFor(req.userId) })
})

// Guarda el token (cifrado) y/o la categoría de las tareas importadas
router.put(
  '/:provider',
  writeLimiter,
  withConnector(async (req, res, connector) => {
    const parsed = putSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error, 'Datos no válidos') })
    const { token, category } = parsed.data

    const current = await prisma.integration.findUnique({ where: keyOf(req, connector), select: { config: true } })
    if (!current && !token) return res.status(400).json({ error: 'Pega tu token' })

    const config = { ...(current?.config ?? {}), ...(category ? { category } : {}) }
    const secret = token ? { tokenEnc: encryptToken(token), lastError: null } : {}
    const row = await prisma.integration.upsert({
      where: keyOf(req, connector),
      create: { userId: req.userId, provider: connector.provider, config, ...secret },
      update: { config, ...secret },
      select: statusSelect,
    })
    res.json({ integration: view(connector, row) })
  }),
)

// Desconecta; con ?deleteTasks=true también borra las tareas importadas de ese servicio
router.delete(
  '/:provider',
  writeLimiter,
  withConnector(async (req, res, connector) => {
    await prisma.integration.deleteMany({ where: { userId: req.userId, provider: connector.provider } })
    let deletedTasks = 0
    if (req.query.deleteTasks === 'true') {
      ;({ count: deletedTasks } = await prisma.task.deleteMany({ where: { userId: req.userId, source: connector.provider } }))
    }
    res.json({ ok: true, deletedTasks, integration: view(connector, null) })
  }),
)

router.post(
  '/:provider/sync',
  syncLimiter,
  withConnector(async (req, res, connector) => {
    const row = await prisma.integration.findUnique({ where: keyOf(req, connector) })
    if (!row) return res.status(404).json({ error: 'Primero conecta el servicio' })
    const result = await syncIntegration(row)
    const fresh = await prisma.integration.findUnique({ where: keyOf(req, connector), select: statusSelect })
    res.json({ result, integration: view(connector, fresh) })
  }),
)

export default router
