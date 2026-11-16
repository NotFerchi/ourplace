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
import taskRoutes from './routes/tasks.js'

const isProd = process.env.NODE_ENV === 'production'
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('Falta JWT_SECRET (mínimo 32 caracteres) en producción')
}

const app = express()
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
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

// En producción el mismo servicio entrega el frontend compilado
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error del servidor' })
})

const port = Number(process.env.PORT) || 3000
app.listen(port, () => console.log(`Our Place API escuchando en :${port}`))
