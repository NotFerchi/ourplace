import { useCallback } from 'react'
import { api } from '../lib/api'
import { dayKey } from '../lib/date'
import { useRemoteList } from './useRemoteList'

/** CRUD de bloques de agenda contra la API. Refleja el modelo `Block` de Prisma. */
export function useBlocks() {
  const { items: blocks, mutate } = useRemoteList('/blocks', 'blocks')

  const addBlock = useCallback(
    ({ title, type, startMin, endMin, repeatWeekly, date }) => {
      const clean = title.trim()
      if (!clean || endMin <= startMin) return false
      const block = {
        id: crypto.randomUUID(),
        title: clean,
        type,
        date: dayKey(date),
        weekday: date.getDay(),
        startMin,
        endMin,
        repeatWeekly,
        createdAt: new Date().toISOString(),
      }
      const { createdAt, ...payload } = block // eslint-disable-line no-unused-vars
      mutate(
        (prev) => [...prev, block],
        () => api.post('/blocks', payload),
      )
      return true
    },
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

  return { blocks, addBlock, removeBlock }
}

/** Bloques que aplican a una fecha: los de ese día + los que se repiten ese día de la semana. */
export function blocksForDate(blocks, date) {
  const key = dayKey(date)
  const weekday = date.getDay()
  return blocks
    .filter((b) => (b.repeatWeekly ? b.weekday === weekday : b.date === key))
    .sort((a, b) => a.startMin - b.startMin)
}
