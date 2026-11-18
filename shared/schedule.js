// Regla de recurrencia de los bloques del horario. La usan el cliente (agenda,
// tarjeta "lo próximo") y el servidor (validar un "saltar este día").
// Las fechas son claves YYYY-MM-DD en hora local del usuario; se comparan como texto.

/** Día de la semana (0 = domingo … 6 = sábado) de una clave YYYY-MM-DD. */
export function weekdayOf(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * ¿El bloque aplica en la fecha `key`?
 *  - sin días de la semana: solo el día de `date`
 *  - con días: esos días desde `date` hasta `rangeEnd` (si hay), menos `skipDates`
 */
export function blockOccursOn(block, key) {
  const days = block.weekdays ?? []
  if (days.length === 0) return key === block.date
  return (
    days.includes(weekdayOf(key)) &&
    key >= block.date &&
    (!block.rangeEnd || key <= block.rangeEnd) &&
    !(block.skipDates ?? []).includes(key)
  )
}

/** Bloques que aplican en la fecha `key`, ordenados por hora de inicio. */
export function blocksForDate(blocks, key) {
  return blocks.filter((b) => blockOccursOn(b, key)).sort((a, b) => a.startMin - b.startMin)
}

export const isSeries = (block) => (block.weekdays ?? []).length > 0
