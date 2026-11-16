import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CornerDownLeft, Plus } from 'lucide-react'
import { CATEGORIES, PRIORITIES } from '../lib/constants'
import { addDays, endOfDay, toLocalInputValue } from '../lib/date'
import { GLASS_DEEP } from './glass'

const WHEN = [
  { id: 'today', label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: 'custom', label: 'Fecha y hora' },
]

function Chip({ active, color, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8rem] transition-colors"
      style={
        active
          ? { borderColor: color, background: `${color}33`, color: '#fff' }
          : { borderColor: 'rgb(255 255 255 / 0.18)', color: 'rgb(255 255 255 / 0.75)' }
      }
    >
      {children}
    </button>
  )
}

/**
 * Captura rápida: escribe, elige categoría / prioridad / fecha y presiona Enter.
 * Se abre desde el dock o con Ctrl/Cmd + K, justo encima del dock.
 */
export default function QuickCapture({ onAdd, onClose }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('ESCUELA')
  const [priority, setPriority] = useState('MEDIA')
  const [when, setWhen] = useState('today')
  const [custom, setCustom] = useState('')
  const [saved, setSaved] = useState(0)
  const input = useRef(null)
  const root = useRef(null)

  useEffect(() => input.current?.focus(), [])

  // Cierra al hacer clic fuera (el botón del dock se encarga de su propio clic)
  useEffect(() => {
    const onDown = (e) => {
      if (root.current?.contains(e.target) || e.target.closest?.('[data-capture-toggle]')) return
      onClose()
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [onClose])

  // Tras elegir una opción el foco vuelve al texto, para seguir escribiendo o dar Enter
  const refocus = () => input.current?.focus()

  // Enter sobre un chip envía la tarea en lugar de volver a pulsar el chip
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'BUTTON' && e.target.type === 'button') {
      e.preventDefault()
      root.current?.requestSubmit()
    }
  }

  const pickWhen = (id) => {
    setWhen(id)
    if (id !== 'custom') refocus()
    if (id === 'custom' && !custom) {
      // Propone la siguiente hora en punto
      const next = new Date()
      next.setHours(next.getHours() + 1, 0, 0, 0)
      setCustom(toLocalInputValue(next))
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return

    const now = new Date()
    let dueAt = endOfDay(now)
    let dueHasTime = false
    if (when === 'tomorrow') dueAt = endOfDay(addDays(now, 1))
    if (when === 'custom' && custom) {
      dueAt = new Date(custom)
      dueHasTime = true
    }

    onAdd({ title, category, priority, dueAt: dueAt.toISOString(), dueHasTime })
    setTitle('')
    setWhen('today')
    setSaved((n) => n + 1)
    input.current?.focus()
  }

  return (
    <motion.form
      ref={root}
      onSubmit={submit}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className={`${GLASS_DEEP} w-[min(34rem,calc(100vw-1.5rem))] rounded-3xl`}
      aria-label="Captura rápida de tareas"
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Plus size={18} className="shrink-0 text-amber-300" aria-hidden="true" />
        <input
          ref={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué tienes pendiente?"
          aria-label="Nueva tarea"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[0.8rem] font-semibold text-stone-950 transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
        >
          Agregar
          <CornerDownLeft size={13} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-2.5 border-t border-white/12 px-4 py-3">
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Categoría</legend>
          {Object.entries(CATEGORIES).map(([id, c]) => (
            <Chip key={id} active={category === id} color={c.color} onClick={() => { setCategory(id); refocus() }}>
              <c.icon size={13} aria-hidden="true" style={{ color: c.color }} />
              {c.label}
            </Chip>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="float-left mr-1 text-[0.8rem] text-white/65">Prioridad</legend>
          {Object.entries(PRIORITIES).map(([id, p]) => (
            <Chip key={id} active={priority === id} color={p.color} onClick={() => { setPriority(id); refocus() }}>
              <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              {p.label}
            </Chip>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="float-left mr-1 text-[0.8rem] text-white/65">Para</legend>
          {WHEN.map((w) => (
            <Chip key={w.id} active={when === w.id} color="#fbbf24" onClick={() => pickWhen(w.id)}>
              {w.label}
            </Chip>
          ))}
          {when === 'custom' && (
            <input
              type="datetime-local"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Fecha y hora límite"
              required
              className="rounded-xl border border-white/18 bg-white/[0.07] px-2 py-1 text-[0.8rem] text-white"
            />
          )}
        </fieldset>

        <p className="text-xs text-white/55" aria-live="polite">
          {saved > 0 ? `${saved === 1 ? '1 tarea agregada' : `${saved} tareas agregadas`}. ` : ''}
          Enter agrega, Esc cierra.
        </p>
      </div>
    </motion.form>
  )
}
