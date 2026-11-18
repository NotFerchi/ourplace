import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Repeat, Trash2, X } from 'lucide-react'
import { weekdayOf } from '../../../shared/schedule.js'
import { CONFIG } from '../config'
import { blocksForDate, isSeries } from '../hooks/useBlocks'
import { BLOCK_TYPES } from '../lib/constants'
import { fmtShortDate, fromDayKey, minToTimeStr, minutesOfDay, timeStrToMin } from '../lib/date'
import Chip from './Chip'
import { CARD } from './glass'

const PX_PER_HOUR = 42
const GUTTER = 40 // ancho de la columna de horas

// Orden de lunes a domingo; el valor es el de Date.getDay() (0 = domingo)
const WEEKDAYS = [
  { value: 1, letter: 'L', name: 'lunes' },
  { value: 2, letter: 'M', name: 'martes' },
  { value: 3, letter: 'X', name: 'miércoles' },
  { value: 4, letter: 'J', name: 'jueves' },
  { value: 5, letter: 'V', name: 'viernes' },
  { value: 6, letter: 'S', name: 'sábado' },
  { value: 0, letter: 'D', name: 'domingo' },
]

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

/** Formulario para agregar un bloque o editar uno existente (si es serie, edita toda la serie). */
function BlockForm({ block, defaultDate, onSubmit, onClose }) {
  const initial = useMemo(
    () =>
      block
        ? { start: minToTimeStr(block.startMin), end: minToTimeStr(block.endMin) }
        : defaultTimes(),
    [block],
  )
  const [title, setTitle] = useState(block?.title ?? '')
  const [type, setType] = useState(block?.type ?? 'CLASE')
  const [date, setDate] = useState(block?.date ?? defaultDate)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [weekly, setWeekly] = useState(block ? isSeries(block) : false)
  const [weekdays, setWeekdays] = useState(block?.weekdays ?? [])
  const [rangeEnd, setRangeEnd] = useState(block?.rangeEnd ?? '')
  const [error, setError] = useState('')
  const titleInput = useRef(null)

  useEffect(() => titleInput.current?.focus(), [])

  const clearError = () => setError('')

  const chooseWeekly = (on) => {
    setWeekly(on)
    clearError()
    // Propone el día de la semana de la fecha elegida
    if (on && weekdays.length === 0 && date) setWeekdays([weekdayOf(date)])
  }

  const toggleDay = (value) => {
    clearError()
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return setError('Escribe un nombre para el bloque.')
    if (!date) return setError('Elige una fecha.')
    const startMin = timeStrToMin(start)
    const endMin = timeStrToMin(end)
    if (endMin <= startMin) return setError('La hora de fin debe ser posterior a la de inicio.')
    if (weekly && weekdays.length === 0) return setError('Elige al menos un día de la semana.')
    if (weekly && rangeEnd && rangeEnd < date) return setError('La fecha "Hasta" no puede ser anterior al primer día.')
    onSubmit({
      title: title.trim(),
      type,
      date,
      startMin,
      endMin,
      weekdays: weekly ? [...weekdays].sort((a, b) => a - b) : [],
      rangeEnd: weekly && rangeEnd ? rangeEnd : null,
    })
    onClose()
    return undefined
  }

  // Esc cierra el formulario sin activar el Modo Zen
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      onKeyDown={onKeyDown}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="thin-scroll max-h-[60%] shrink-0 overflow-y-auto"
      aria-label={block ? 'Editar bloque' : 'Agregar bloque'}
    >
      <div className="grid gap-2 border-b border-white/12 px-4 pb-3.5">
        <input
          ref={titleInput}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            clearError()
          }}
          placeholder="Nombre del bloque"
          aria-label="Nombre del bloque"
          autoComplete="off"
          maxLength={120}
          className={FIELD}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de bloque" className={FIELD}>
          {Object.entries(BLOCK_TYPES).map(([id, t]) => (
            <option key={id} value={id}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="text-xs text-white/70">
          {weekly ? 'Desde' : 'Fecha'}
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); clearError() }} required className={`${FIELD} mt-1`} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-white/70">
            Inicio
            <input type="time" value={start} onChange={(e) => { setStart(e.target.value); clearError() }} required className={`${FIELD} mt-1`} />
          </label>
          <label className="text-xs text-white/70">
            Fin
            <input type="time" value={end} onChange={(e) => { setEnd(e.target.value); clearError() }} required className={`${FIELD} mt-1`} />
          </label>
        </div>

        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="float-left mr-1 text-[0.8rem] text-white/65">Repetir</legend>
          <Chip active={!weekly} color="#fbbf24" onClick={() => chooseWeekly(false)}>
            Solo ese día
          </Chip>
          <Chip active={weekly} color="#fbbf24" onClick={() => chooseWeekly(true)}>
            Días de la semana
          </Chip>
        </fieldset>

        {weekly && (
          <>
            <fieldset className="flex flex-wrap gap-1">
              <legend className="sr-only">Días de la semana</legend>
              {WEEKDAYS.map((d) => (
                <Chip key={d.value} active={weekdays.includes(d.value)} color="#fbbf24" onClick={() => toggleDay(d.value)} label={d.name}>
                  <span className="w-3 text-center" aria-hidden="true">
                    {d.letter}
                  </span>
                </Chip>
              ))}
            </fieldset>
            <label className="text-xs text-white/70">
              Hasta (opcional)
              <input
                type="date"
                value={rangeEnd}
                min={date || undefined}
                onChange={(e) => { setRangeEnd(e.target.value); clearError() }}
                className={`${FIELD} mt-1`}
              />
            </label>
          </>
        )}

        {block && isSeries(block) && <p className="text-xs text-white/60">Los cambios aplican a toda la serie.</p>}
        {error && (
          <p role="alert" className="text-[0.8rem] text-rose-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-amber-400 px-3 py-1.5 text-[0.86rem] font-semibold text-stone-950 transition-opacity hover:opacity-90"
        >
          {block ? 'Guardar cambios' : 'Agregar bloque'}
        </button>
      </div>
    </motion.form>
  )
}

/** Pregunta qué borrar de un bloque que se repite. */
function DeleteSeriesPrompt({ block, onOnlyDay, onAll, onCancel }) {
  const btn = 'cursor-pointer rounded-xl px-2.5 py-1.5 text-[0.8rem] transition-colors'
  return (
    <motion.div
      role="alertdialog"
      aria-labelledby="delete-series-title"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="shrink-0 overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
    >
      <div className="grid gap-2 border-b border-white/12 px-4 pb-3.5">
        <p id="delete-series-title" className="text-[0.84rem] text-white/90">
          «{block.title}» se repite. ¿Qué quieres borrar?
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" autoFocus onClick={onOnlyDay} className={`${btn} border border-white/20 text-white hover:border-amber-300`}>
            Solo este día
          </button>
          <button type="button" onClick={onAll} className={`${btn} bg-rose-400/20 text-rose-200 hover:bg-rose-400/30`}>
            Toda la serie
          </button>
          <button type="button" onClick={onCancel} className={`${btn} text-white/70 hover:text-white`}>
            Cancelar
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Agenda de un día (hoy, o el que elijas en la semana): línea de tiempo por horas.
 * `day` es la clave YYYY-MM-DD; `isToday` decide si se dibuja la línea de "ahora".
 */
export default function AgendaPanel({ blocks, now, day, isToday, onToday, onAdd, onEdit, onSkip, onRemove }) {
  // null | { mode: 'add' } | { mode: 'edit', block }
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const scroller = useRef(null)

  const dayBlocks = useMemo(() => blocksForDate(blocks, day), [blocks, day])
  const { items, lanes } = useMemo(() => layoutBlocks(dayBlocks), [dayBlocks])

  const earliest = dayBlocks.length ? Math.floor(dayBlocks[0].startMin / 60) : CONFIG.agenda.startHour
  const startHour = Math.min(CONFIG.agenda.startHour, earliest)
  const endHour = CONFIG.agenda.endHour
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
  const toY = (min) => ((min - startHour * 60) / 60) * PX_PER_HOUR

  const nowMin = minutesOfDay(now)
  const nowVisible = isToday && nowMin >= startHour * 60 && nowMin <= endHour * 60

  // Al abrir o cambiar de día: hoy se centra cerca de la hora actual; otro día, en su primer bloque
  const firstStart = dayBlocks[0]?.startMin
  useEffect(() => {
    if (!scroller.current) return
    const target = isToday ? minutesOfDay(new Date()) : (firstStart ?? CONFIG.agenda.startHour * 60)
    scroller.current.scrollTop = Math.max(0, toY(target) - 70)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  const closeForm = () => setForm(null)

  const askRemove = (b) => {
    setForm(null)
    if (isSeries(b)) setDeleting(b)
    else onRemove(b.id)
  }

  return (
    <section className={`${CARD} flex min-h-0 flex-1 flex-col`} aria-labelledby="agenda-title">
      <header className="flex shrink-0 items-center justify-between gap-2 px-5 pt-4 pb-3">
        <h2 id="agenda-title" className="truncate text-sm font-medium">
          {isToday ? 'Agenda del día' : <span className="first-letter:uppercase">Agenda · {fmtShortDate(fromDayKey(day))}</span>}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isToday && (
            <button
              type="button"
              onClick={onToday}
              className="cursor-pointer rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/90 transition-colors hover:border-amber-300 hover:text-white"
            >
              Hoy
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setDeleting(null)
              setForm((f) => (f ? null : { mode: 'add' }))
            }}
            aria-expanded={Boolean(form)}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/90 transition-colors hover:border-amber-300 hover:text-white"
          >
            {form ? <X size={12} aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}
            {form ? 'Cancelar' : 'Agregar bloque'}
          </button>
        </div>
      </header>

      <AnimatePresence initial={false} mode="wait">
        {form && (
          <BlockForm
            key={form.mode === 'edit' ? form.block.id : 'add'}
            block={form.mode === 'edit' ? form.block : null}
            defaultDate={day}
            onSubmit={(values) => (form.mode === 'edit' ? onEdit(form.block.id, values) : onAdd(values))}
            onClose={closeForm}
          />
        )}
        {deleting && (
          <DeleteSeriesPrompt
            key={`del-${deleting.id}`}
            block={deleting}
            onOnlyDay={() => {
              onSkip(deleting.id, day)
              setDeleting(null)
            }}
            onAll={() => {
              onRemove(deleting.id)
              setDeleting(null)
            }}
            onCancel={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>

      <div ref={scroller} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {dayBlocks.length === 0 && !form && (
          <p className="px-2 pb-2 text-sm leading-relaxed text-white/70">
            {isToday ? 'Tu día está libre.' : 'Este día está libre.'} Agrega clases, estudio, gym o desarrollo.
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
                    className="group absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-0.5 backdrop-blur-sm transition-[filter] hover:brightness-125"
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
                      {isSeries(b) && <Repeat size={10} className="shrink-0 text-white/60" aria-label="Se repite" />}
                    </p>
                    {height >= 36 && (
                      <p className="mt-0.5 text-[0.7rem] tabular-nums text-white/75">
                        {minToTimeStr(b.startMin)} a {minToTimeStr(b.endMin)}
                      </p>
                    )}
                    {/* Toda la tarjeta abre la edición; el botón de borrar queda encima */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleting(null)
                        setForm({ mode: 'edit', block: b })
                      }}
                      aria-label={`Editar bloque "${b.title}"`}
                      className="absolute inset-0 cursor-pointer rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => askRemove(b)}
                      aria-label={`Eliminar bloque "${b.title}"`}
                      className="absolute top-0.5 right-0.5 z-10 cursor-pointer rounded-md bg-stone-950/50 p-1 text-white/70 opacity-70 transition hover:text-rose-300 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
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
