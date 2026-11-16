import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Repeat, Trash2, X } from 'lucide-react'
import { CONFIG } from '../config'
import { blocksForDate } from '../hooks/useBlocks'
import { BLOCK_TYPES } from '../lib/constants'
import { minToTimeStr, minutesOfDay, timeStrToMin } from '../lib/date'
import { CARD } from './glass'

const PX_PER_HOUR = 42
const GUTTER = 40 // ancho de la columna de horas

/** Reparte bloques que se enciman en carriles lado a lado. */
function layoutBlocks(blocks) {
  const laneEnds = []
  const items = blocks.map((b) => {
    let lane = laneEnds.findIndex((end) => end <= b.startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(b.endMin)
    } else {
      laneEnds[lane] = b.endMin
    }
    return { ...b, lane }
  })
  return { items, lanes: Math.max(1, laneEnds.length) }
}

function defaultTimes() {
  const start = Math.min(22 * 60, (new Date().getHours() + 1) * 60)
  return { start: minToTimeStr(start), end: minToTimeStr(start + 60) }
}

const FIELD =
  'w-full rounded-xl border border-white/15 bg-white/[0.07] px-2.5 py-1.5 text-[0.86rem] text-white placeholder:text-white/45'

function BlockForm({ onAdd, onClose }) {
  const initial = useMemo(defaultTimes, [])
  const [title, setTitle] = useState('')
  const [type, setType] = useState('CLASE')
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [error, setError] = useState('')
  const titleInput = useRef(null)

  useEffect(() => titleInput.current?.focus(), [])

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return setError('Escribe un nombre para el bloque.')
    const startMin = timeStrToMin(start)
    const endMin = timeStrToMin(end)
    if (endMin <= startMin) return setError('La hora de fin debe ser posterior a la de inicio.')
    onAdd({ title, type, startMin, endMin, repeatWeekly, date: new Date() })
    onClose()
    return undefined
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="shrink-0 overflow-hidden"
    >
      <div className="grid gap-2 border-b border-white/12 px-4 pb-3.5">
        <input
          ref={titleInput}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError('')
          }}
          placeholder="Nombre del bloque"
          aria-label="Nombre del bloque"
          autoComplete="off"
          className={FIELD}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de bloque" className={FIELD}>
          {Object.entries(BLOCK_TYPES).map(([id, t]) => (
            <option key={id} value={id}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-white/70">
            Inicio
            <input type="time" value={start} onChange={(e) => { setStart(e.target.value); setError('') }} required className={`${FIELD} mt-1`} />
          </label>
          <label className="text-xs text-white/70">
            Fin
            <input type="time" value={end} onChange={(e) => { setEnd(e.target.value); setError('') }} required className={`${FIELD} mt-1`} />
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-white/85">
          <input
            type="checkbox"
            checked={repeatWeekly}
            onChange={(e) => setRepeatWeekly(e.target.checked)}
            className="size-4 accent-amber-400"
          />
          Repetir cada semana este día
        </label>
        {error && (
          <p role="alert" className="text-[0.8rem] text-rose-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-amber-400 px-3 py-1.5 text-[0.86rem] font-semibold text-stone-950 transition-opacity hover:opacity-90"
        >
          Agregar bloque
        </button>
      </div>
    </motion.form>
  )
}

/** Agenda del día: línea de tiempo compacta por horas con los bloques de hoy. */
export default function AgendaPanel({ blocks, now, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false)
  const scroller = useRef(null)

  const todays = useMemo(() => blocksForDate(blocks, now), [blocks, now])
  const { items, lanes } = useMemo(() => layoutBlocks(todays), [todays])

  const earliest = todays.length ? Math.floor(todays[0].startMin / 60) : CONFIG.agenda.startHour
  const startHour = Math.min(CONFIG.agenda.startHour, earliest)
  const endHour = CONFIG.agenda.endHour
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
  const toY = (min) => ((min - startHour * 60) / 60) * PX_PER_HOUR

  const nowMin = minutesOfDay(now)
  const nowVisible = nowMin >= startHour * 60 && nowMin <= endHour * 60

  // Al abrir, centra la vista cerca de la hora actual
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, toY(minutesOfDay(new Date())) - 70)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className={`${CARD} flex min-h-0 flex-1 flex-col`} aria-labelledby="agenda-title">
      <header className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3">
        <h2 id="agenda-title" className="text-sm font-medium">
          Agenda del día
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
          className="flex cursor-pointer items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/90 transition-colors hover:border-amber-300 hover:text-white"
        >
          {adding ? <X size={12} aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}
          {adding ? 'Cancelar' : 'Agregar bloque'}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {adding && <BlockForm key="form" onAdd={onAdd} onClose={() => setAdding(false)} />}
      </AnimatePresence>

      <div ref={scroller} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {todays.length === 0 && !adding && (
          <p className="px-2 pb-2 text-sm leading-relaxed text-white/70">
            Tu día está libre. Agrega clases, estudio, gym o desarrollo.
          </p>
        )}

        <div className="relative mt-2" style={{ height: (endHour - startHour) * PX_PER_HOUR + 10 }}>
          {hours.map((h) => (
            <div key={h} className="absolute inset-x-0 flex items-center" style={{ top: toY(h * 60) }}>
              <span className="-translate-y-1/2 text-right text-[0.7rem] tabular-nums text-white/60" style={{ width: GUTTER - 8 }}>
                {minToTimeStr(h * 60)}
              </span>
              <span className="ml-2 h-px flex-1 bg-white/12" />
            </div>
          ))}

          <div className="absolute inset-y-0 right-0" style={{ left: GUTTER }}>
            <AnimatePresence initial={false}>
              {items.map((b) => {
                const type = BLOCK_TYPES[b.type]
                const top = toY(Math.max(b.startMin, startHour * 60))
                const height = Math.max(22, toY(b.endMin) - top - 2)
                return (
                  <motion.article
                    key={b.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="group absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-0.5 backdrop-blur-sm"
                    style={{
                      top,
                      height,
                      left: `calc(${(b.lane / lanes) * 100}% + 1px)`,
                      width: `calc(${100 / lanes}% - 3px)`,
                      borderColor: type.color,
                      background: `${type.color}3d`,
                    }}
                  >
                    <p className="flex items-center gap-1.5 truncate text-[0.8rem] leading-tight font-medium text-white">
                      <type.icon size={12} className="shrink-0" style={{ color: type.color }} aria-hidden="true" />
                      <span className="truncate">{b.title}</span>
                      {b.repeatWeekly && <Repeat size={10} className="shrink-0 text-white/60" aria-label="Se repite cada semana" />}
                    </p>
                    {height >= 36 && (
                      <p className="mt-0.5 text-[0.7rem] tabular-nums text-white/75">
                        {minToTimeStr(b.startMin)} a {minToTimeStr(b.endMin)}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(b.id)}
                      aria-label={`Eliminar bloque "${b.title}"`}
                      className="absolute top-0.5 right-0.5 cursor-pointer rounded-md bg-stone-950/50 p-1 text-white/70 opacity-70 transition hover:text-rose-300 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 size={11} aria-hidden="true" />
                    </button>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>

          {nowVisible && (
            <div className="pointer-events-none absolute inset-x-0 flex items-center" style={{ top: toY(nowMin) }} aria-hidden="true">
              <span className="-translate-y-1/2 rounded bg-amber-400 px-1 text-[0.66rem] font-semibold tabular-nums text-stone-950">
                {minToTimeStr(nowMin)}
              </span>
              <span className="h-[2px] flex-1 -translate-y-1/2 rounded bg-amber-400 shadow-[0_0_10px_#fbbf24]" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
