import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'

const router = Router()

const select = {
  id: true,
  title: true,
  type: true,
  date: true,
  weekday: true,
  startMin: true,
  endMin: true,
  repeatWeekly: true,
  createdAt: true,
}

const createSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1).max(120),
    type: z.enum(['CLASE', 'ESTUDIO', 'GYM', 'DESARROLLO', 'OTRO']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weekday: z.number().int().min(0).max(6),
    startMin: z.number().int().min(0).max(1440),
    endMin: z.number().int().min(0).max(1440),
    repeatWeekly: z.boolean(),
  })
  .refine((b) => b.endMin > b.startMin)

router.get('/', async (req, res) => {
  const blocks = await prisma.block.findMany({ where: { userId: req.userId }, select, orderBy: { startMin: 'asc' } })
  res.json({ blocks })
})

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Bloque no válido' })
  try {
    const block = await prisma.block.create({ data: { ...parsed.data, userId: req.userId }, select })
    res.status(201).json({ block })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ese bloque ya existe' })
    throw err
  }
})

router.delete('/:id', async (req, res) => {
  await prisma.block.deleteMany({ where: { id: req.params.id, userId: req.userId } })
  res.json({ ok: true })
})

export default router
