import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { prisma } from './db.js'
import { requireAuth } from './auth.js'
import authRoutes from './routes/auth.js'
import blockRoutes from './routes/blocks.js'
import integrationRoutes from './routes/integrations.js'
import taskRoutes from './routes/tasks.js'

export const app = express()
app.set('trust proxy', 1) // Render va detrás de un proxy: necesario para IP real y cookies seguras
// Sin CSP: WebGL (three.js) usa blobs/data URLs y el build de Vite ya es solo archivos propios
app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true })
  } catch {
    res.status(503).json({ ok: false })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/tasks', requireAuth, taskRoutes)
app.use('/api/blocks', requireAuth, blockRoutes)
app.use('/api/integrations', requireAuth, integrationRoutes)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

// En producción el mismo servicio entrega el frontend compilado
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Errores con `expose` traen un mensaje pensado para el usuario (p. ej. falta TOKEN_ENC_KEY)
  if (err.expose) return res.status(err.status ?? 400).json({ error: err.message })
  console.error(err)
  res.status(500).json({ error: 'Error del servidor' })
})
