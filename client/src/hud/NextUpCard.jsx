import { useMemo } from 'react'
import { Hourglass, Play, Timer } from 'lucide-react'
import { blocksForDate } from '../hooks/useBlocks'
import { useNow } from '../hooks/useNow'
import { BLOCK_TYPES, CATEGORIES } from '../lib/constants'
import { dayKey, fmtShortDate, fmtTime, minToTimeStr, minutesOfDay, startOfDay } from '../lib/date'

const atMinutes = (now, min) => new Date(startOfDay(now).getTime() + min * 60000)
const pad = (n) => String(n).padStart(2, '0')

/**
 * Qué mostrar en la tarjeta:
 *  1. El bloque que está en curso ahora mismo, con el tiempo que le queda.
 *  2. Si no hay, lo que llegue antes: el siguiente bloque de hoy o la
 *     siguiente tarea pendiente.
 */
function pickNext(tasks, blocks, now) {
  const nowMin = minutesOfDay(now)
  const todays = blocksForDate(blocks, dayKey(now))

  const active = todays.find((b) => b.startMin <= nowMin && nowMin < b.endMin)
  if (active) {
    return {
      kind: 'active',
      label: 'Bloque activo',
      icon: Play,
      title: active.title,
      tag: BLOCK_TYPES[active.type].label,
      target: atMinutes(now, active.endMin),
      detail: `Termina a las ${minToTimeStr(active.endMin)}`,
    }
  }

  const options = []
  const block = todays.find((b) => b.startMin > nowMin)
  if (block) {
    options.push({
      kind: 'block',
      label: 'Próximo bloque',
      icon: Timer,
      title: block.title,
      tag: BLOCK_TYPES[block.type].label,
      target: atMinutes(now, block.startMin),
      detail: `Empieza a las ${minToTimeStr(block.startMin)}`,
    })
  }
  const task = tasks
    .filter((t) => !t.done && new Date(t.dueAt) > now)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0]
  if (task) {
    const due = new Date(task.dueAt)
    const isToday = startOfDay(due).getTime() === startOfDay(now).getTime()
    const day = isToday ? 'hoy' : fmtShortDate(due)
    options.push({
      kind: 'task',
      label: 'Próxima entrega',
      icon: Hourglass,
      title: task.title,
      tag: CATEGORIES[task.category].label,
      target: due,
      detail: task.dueHasTime ? `Vence ${day} a las ${fmtTime(due)}` : `Vence ${day}`,
    })
  }
  options.sort((a, b) => a.target - b.target)
  return options[0] ?? null
}

function countdown(target, now) {
  const total = Math.max(0, Math.floor((target - now) / 1000))
  const days = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (days > 0) return `${days} d ${h} h`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** Tarjeta de acento: próxima entrega o bloque activo, con cuenta regresiva en vivo. */
export default function NextUpCard({ tasks, blocks }) {
  const now = useNow(1000)
  // Se recalcula por minuto; el segundero solo mueve la cuenta regresiva
  const minuteKey = Math.floor(now.getTime() / 60000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const next = useMemo(() => pickNext(tasks, blocks, now), [tasks, blocks, minuteKey])

  return (
    <section
      className="shrink-0 rounded-3xl bg-amber-400/90 px-5 py-4 text-stone-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45),0_18px_50px_rgba(180,110,0,0.28)] backdrop-blur-xl"
      aria-live="off"
      aria-label={next ? next.label : 'Sin pendientes próximos'}
    >
      {next ? (
        <>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <next.icon size={13} strokeWidth={2.4} aria-hidden="true" />
              {next.label}
            </span>
            <span className="rounded-full bg-stone-950/12 px-2 py-0.5">{next.tag}</span>
          </div>
          <h2 className="mt-2.5 line-clamp-2 text-lg leading-snug font-semibold">{next.title}</h2>
          <p className="mt-1.5 text-4xl leading-none font-light tabular-nums" role="timer">
            {countdown(next.target, now)}
          </p>
          <p className="mt-2 text-sm text-stone-950/75">{next.detail}</p>
        </>
      ) : (
        <>
          <p className="text-xs font-medium">Próxima entrega</p>
          <h2 className="mt-2.5 text-lg leading-snug font-semibold">Nada en puerta</h2>
          <p className="mt-1 text-sm text-stone-950/75">Captura una tarea con fecha o agrega un bloque a la agenda.</p>
        </>
      )}
    </section>
  )
}
