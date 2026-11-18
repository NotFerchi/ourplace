import { useCallback } from 'react'
import { weekdayOf } from '../../../shared/schedule.js'
import { api } from '../lib/api'
import { useRemoteList } from './useRemoteList'

export { blocksForDate, isSeries } from '../../../shared/schedule.js'

/** Copia local de lo que el servidor deriva (columnas de compatibilidad, rangeEnd fuera de serie). */
const derive = (b) => ({
  ...b,
  rangeEnd: b.weekdays.length ? b.rangeEnd : null,
  weekday: weekdayOf(b.date),
  repeatWeekly: b.weekdays.length > 0,
})

/**
 * CRUD de bloques de agenda contra la API. Refleja el modelo `Block` de Prisma.
 * `date` es la clave YYYY-MM-DD del día (o del primer día, si es serie).
 */
export function useBlocks() {
  const { items: blocks, mutate } = useRemoteList('/blocks', 'blocks')

  const addBlock = useCallback(
    ({ title, type, date, startMin, endMin, weekdays = [], rangeEnd = null }) => {
      const clean = title.trim()
      if (!clean || endMin <= startMin) return false
      const payload = { id: crypto.randomUUID(), title: clean, type, date, startMin, endMin, weekdays, rangeEnd }
      const block = derive({ ...payload, skipDates: [], createdAt: new Date().toISOString() })
      mutate(
        (prev) => [...prev, block],
        () => api.post('/blocks', payload),
      )
      return true
    },
    [mutate],
  )

  /** Cambia campos de un bloque (o de toda la serie). */
  const editBlock = useCallback(
    (id, changes) =>
      mutate(
        (prev) => prev.map((b) => (b.id === id ? derive({ ...b, ...changes }) : b)),
        () => api.patch(`/blocks/${id}`, changes),
      ),
    [mutate],
  )

  /** Quita solo el día `date` de una serie. */
  const skipBlockDay = useCallback(
    (id, date) =>
      mutate(
        (prev) => prev.map((b) => (b.id === id ? { ...b, skipDates: [...b.skipDates, date] } : b)),
        () => api.post(`/blocks/${id}/skip`, { date }),
      ),
    [mutate],
  )

  const removeBlock = useCallback(
    (id) =>
      mutate(
        (prev) => prev.filter((b) => b.id !== id),
        () => api.del(`/blocks/${id}`),
      ),
    [mutate],
  )

  return { blocks, addBlock, editBlock, skipBlockDay, removeBlock }
}
