import { useMemo } from 'react'
import { addDays, dayKey, startOfDay } from '../lib/date'
import { CARD } from './glass'

const LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const monthFmt = new Intl.DateTimeFormat('es-MX', { month: 'long' })

/** Semana en curso (lunes a domingo). El punto marca días con tareas pendientes. */
export default function WeekStrip({ now, tasks }) {
  const days = useMemo(() => {
    const today = startOfDay(now)
    const monday = addDays(today, -((today.getDay() + 6) % 7))
    const pending = new Map()
    for (const t of tasks) {
      if (t.done) continue
      const key = dayKey(new Date(t.dueAt))
      pending.set(key, (pending.get(key) || 0) + 1)
    }
    return LETTERS.map((letter, i) => {
      const date = addDays(monday, i)
      const key = dayKey(date)
      return {
        key,
        letter,
        name: NAMES[i],
        number: date.getDate(),
        isToday: key === dayKey(today),
        isPast: date < today,
        pending: pending.get(key) || 0,
      }
    })
  }, [now, tasks])

  return (
    <section className={`${CARD} shrink-0 px-4 py-3.5`} aria-label="Semana en curso">
      <div className="mb-2.5 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-medium">Esta semana</h2>
        <p className="text-xs text-white/65 first-letter:uppercase">{monthFmt.format(now)}</p>
      </div>
      <ol className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <li
            key={d.key}
            className="flex flex-col items-center gap-1"
            aria-current={d.isToday ? 'date' : undefined}
            aria-label={`${d.name} ${d.number}${d.pending ? `, ${d.pending} pendientes` : ''}`}
          >
            <span className={`text-[0.7rem] ${d.isToday ? 'font-semibold text-amber-300' : 'text-white/60'}`}>{d.letter}</span>
            <span
              className={`grid size-8 place-items-center rounded-full text-[0.82rem] tabular-nums ${
                d.isToday
                  ? 'bg-amber-400 font-semibold text-stone-950 shadow-[0_0_18px_rgba(251,191,36,0.55)]'
                  : `border border-white/15 ${d.isPast ? 'text-white/45' : 'text-white/90'}`
              }`}
            >
              {d.number}
            </span>
            <span className={`size-1 rounded-full ${d.pending ? (d.isToday ? 'bg-amber-300' : 'bg-white/70') : 'bg-transparent'}`} />
          </li>
        ))}
      </ol>
    </section>
  )
}
