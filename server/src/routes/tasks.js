import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'

const router = Router()

// Campos que el frontend recibe (userId y notifiedAt se quedan en el servidor)
const select = {
  id: true,
  title: true,
  notes: true,
  category: true,
  priority: true,
  dueAt: true,
  dueHasTime: true,
  done: true,
  completedAt: true,
  createdAt: true,
  // Importadas: de dónde vienen y enlace para abrirlas allá
  source: true,
  externalUrl: true,
}

// Notas vacías se guardan como null
const notes = z
  .string()
  .trim()
  .max(2000, 'Las notas pueden tener hasta 2000 caracteres')
  .nullable()
  .transform((s) => s || null)

const base = z.object({
  title: z.string().trim().min(1, 'Escribe un título').max(200, 'El título es demasiado largo'),
  notes: notes.optional(),
  category: z.enum(['ESCUELA', 'PROYECTO', 'PERSONAL']),
  priority: z.enum(['ALTA', 'MEDIA', 'BAJA']),
  dueAt: z.iso.datetime({ offset: true }),
  dueHasTime: z.boolean(),
})
const createSchema = base.extend({ id: z.uuid().optional() })
const patchSchema = base
  .partial()
  .extend({ done: z.boolean().optional(), completedAt: z.iso.datetime({ offset: true }).nullable().optional() })

const firstIssue = (err, fallback) => err.issues?.[0]?.message ?? fallback

router.get('/', async (req, res) => {
  const tasks = await prisma.task.findMany({ where: { userId: req.userId }, select, orderBy: { createdAt: 'desc' } })
  res.json({ tasks })
})

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error, 'Tarea no válida') })
  try {
    const task = await prisma.task.create({ data: { ...parsed.data, userId: req.userId }, select })
    res.status(201).json({ task })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Esa tarea ya existe' })
    throw err
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error, 'Cambios no válidos') })
  // updateMany con userId: nadie puede tocar tareas de otra cuenta
  const { count } = await prisma.task.updateMany({ where: { id: req.params.id, userId: req.userId }, data: parsed.data })
  if (!count) return res.status(404).json({ error: 'Tarea no encontrada' })
  res.json({ task: await prisma.task.findUnique({ where: { id: req.params.id }, select }) })
})

router.delete('/:id', async (req, res) => {
  await prisma.task.deleteMany({ where: { id: req.params.id, userId: req.userId } })
  res.json({ ok: true })
})

export default router
