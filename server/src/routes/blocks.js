import { Router } from 'express'
import { z } from 'zod'
import { blockOccursOn, isSeries, weekdayOf } from '../../../shared/schedule.js'
import { prisma } from '../db.js'

const router = Router()

const select = {
  id: true,
  title: true,
  type: true,
  date: true,
  weekdays: true,
  rangeEnd: true,
  skipDates: true,
  startMin: true,
  endMin: true,
  // Compatibilidad con clientes anteriores a `weekdays`
  weekday: true,
  repeatWeekly: true,
  createdAt: true,
}

const day = z.iso.date('Fecha no válida')

// Campos editables de un bloque
const fields = z.object({
  title: z.string().trim().min(1, 'Escribe un nombre para el bloque').max(120, 'El nombre es demasiado largo'),
  type: z.enum(['CLASE', 'ESTUDIO', 'GYM', 'DESARROLLO', 'OTRO']),
  date: day,
  startMin: z.number().int().min(0).max(1440),
  endMin: z.number().int().min(0).max(1440),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
  rangeEnd: day.nullable(),
})

/** Reglas entre campos; se aplican al bloque completo (en PATCH, ya combinado con lo guardado). */
function checkBlock(b, ctx) {
  if (b.endMin <= b.startMin) ctx.addIssue({ code: 'custom', message: 'La hora de fin debe ser posterior a la de inicio' })
  if (b.weekdays.length && b.rangeEnd && b.rangeEnd < b.date) {
    ctx.addIssue({ code: 'custom', message: 'La fecha "Hasta" no puede ser anterior al primer día' })
  }
}
const fullSchema = fields.superRefine(checkBlock)

const createSchema = z.preprocess(
  // Clientes anteriores mandan repeatWeekly + weekday en lugar de weekdays
  (body) =>
    body && typeof body === 'object' && body.weekdays === undefined && body.repeatWeekly === true
      ? { ...body, weekdays: [body.weekday] }
      : body,
  fields
    .extend({ id: z.uuid().optional(), weekdays: fields.shape.weekdays.default([]), rangeEnd: day.nullable().default(null) })
    .superRefine(checkBlock),
)
const patchSchema = fields.partial()
const skipSchema = z.object({ date: day })

const firstIssue = (err, fallback) => err.issues?.[0]?.message ?? fallback

/** Mantiene coherentes las columnas de compatibilidad y limpia rangeEnd fuera de una serie. */
const toRow = (b) => ({
  ...b,
  rangeEnd: b.weekdays.length ? b.rangeEnd : null,
  weekday: weekdayOf(b.date),
  repeatWeekly: b.weekdays.length > 0,
})

const findOwn = (req) => prisma.block.findFirst({ where: { id: req.params.id, userId: req.userId }, select })

router.get('/', async (req, res) => {
  const blocks = await prisma.block.findMany({ where: { userId: req.userId }, select, orderBy: { startMin: 'asc' } })
  res.json({ blocks })
})

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error, 'Bloque no válido') })
  try {
    const block = await prisma.block.create({ data: { ...toRow(parsed.data), userId: req.userId }, select })
    res.status(201).json({ block })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ese bloque ya existe' })
    throw err
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error, 'Cambios no válidos') })
  const current = await findOwn(req)
  if (!current) return res.status(404).json({ error: 'Bloque no encontrado' })

  const merged = fullSchema.safeParse({ ...pick(current), ...parsed.data })
  if (!merged.success) return res.status(400).json({ error: firstIssue(merged.error, 'Cambios no válidos') })
  // updateMany con userId: nadie puede tocar bloques de otra cuenta
  const { count } = await prisma.block.updateMany({ where: { id: current.id, userId: req.userId }, data: toRow(merged.data) })
  if (!count) return res.status(404).json({ error: 'Bloque no encontrado' })
  res.json({ block: await findOwn(req) })
})

// Quita un día de una serie sin tocar el resto
router.post('/:id/skip', async (req, res) => {
  const parsed = skipSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error, 'Fecha no válida') })
  const { date } = parsed.data
  const current = await findOwn(req)
  if (!current) return res.status(404).json({ error: 'Bloque no encontrado' })
  if (!isSeries(current)) return res.status(400).json({ error: 'Este bloque no se repite; bórralo completo' })
  if (current.skipDates.includes(date)) return res.json({ block: current })
  if (!blockOccursOn(current, date)) return res.status(400).json({ error: 'Ese día no es parte de la serie' })

  await prisma.block.updateMany({ where: { id: current.id, userId: req.userId }, data: { skipDates: { push: date } } })
  res.json({ block: await findOwn(req) })
})

router.delete('/:id', async (req, res) => {
  await prisma.block.deleteMany({ where: { id: req.params.id, userId: req.userId } })
  res.json({ ok: true })
})

/** Solo los campos editables de un bloque guardado. */
function pick(b) {
  return Object.fromEntries(Object.keys(fields.shape).map((k) => [k, b[k]]))
}

export default router
