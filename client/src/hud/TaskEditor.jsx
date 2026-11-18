import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, X } from 'lucide-react'
import { CATEGORIES, PRIORITIES } from '../lib/constants'
import { dayKey, endOfDay, minToTimeStr, minutesOfDay } from '../lib/date'
import Chip from './Chip'
import { GLASS_DEEP } from './glass'

const FIELD =
  'w-full rounded-xl border border-white/15 bg-white/[0.07] px-2.5 py-1.5 text-[0.86rem] text-white placeholder:text-white/45'

/** Fecha local a partir de "YYYY-MM-DD" (+ "HH:MM" opcional). */
function toDate(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!timeStr) return endOfDay(new Date(y, m - 1, d))
  const [h, min] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

/**
 * Panel de cristal para editar una tarea. Esc cierra (lo maneja App) y
 * Enter en el título guarda.
 */
export default function TaskEditor({ task, onSave, onRemove, onClose }) {
  const due = new Date(task.dueAt)
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [category, setCategory] = useState(task.category)
  const [priority, setPriority] = useState(task.priority)
  const [date, setDate] = useState(dayKey(due))
  const [hasTime, setHasTime] = useState(task.dueHasTime)
  const [time, setTime] = useState(task.dueHasTime ? minToTimeStr(minutesOfDay(due)) : '09:00')
  const [error, setError] = useState('')
  const titleInput = useRef(null)

  useEffect(() => titleInput.current?.select(), [])

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return setError('Escribe un título.')
    if (!date) return setError('Elige una fecha.')
    const dueAt = toDate(date, hasTime ? time : null).toISOString()
    onSave(task.id, { title, notes, category, priority, dueAt, dueHasTime: hasTime })
    onClose()
    return undefined
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center bg-stone-950/30 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-editor-title"
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        className={`${GLASS_DEEP} thin-scroll grid max-h-[calc(100dvh-1.5rem)] w-[min(30rem,calc(100vw-1.5rem))] gap-3 overflow-y-auto rounded-3xl p-5`}
      >
        <div className="flex items-center justify-between">
          <h2 id="task-editor-title" className="text-sm font-medium">
            Editar tarea
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer rounded-md p-1 text-white/60 transition-colors hover:text-white"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <input
          ref={titleInput}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError('')
          }}
          aria-label="Título"
          maxLength={200}
          autoComplete="off"
          className={`${FIELD} text-base`}
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          aria-label="Notas"
          maxLength={2000}
          rows={4}
          className={`${FIELD} thin-scroll resize-y`}
        />

        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Categoría</legend>
          {Object.entries(CATEGORIES).map(([id, c]) => (
            <Chip key={id} active={category === id} color={c.color} onClick={() => setCategory(id)}>
              <c.icon size={13} aria-hidden="true" style={{ color: c.color }} />
              {c.label}
            </Chip>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="float-left mr-1 text-[0.8rem] text-white/65">Prioridad</legend>
          {Object.entries(PRIORITIES).map(([id, p]) => (
            <Chip key={id} active={priority === id} color={p.color} onClick={() => setPriority(id)}>
              <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              {p.label}
            </Chip>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 items-end gap-2">
          <label className="text-xs text-white/70">
            Fecha
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setError('')
              }}
              required
              className={`${FIELD} mt-1`}
            />
          </label>
          <label className="text-xs text-white/70">
            Hora
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!hasTime}
              required={hasTime}
              className={`${FIELD} mt-1 disabled:opacity-40`}
            />
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-white/85">
          <input
            type="checkbox"
            checked={!hasTime}
            onChange={(e) => setHasTime(!e.target.checked)}
            className="size-4 accent-amber-400"
          />
          Sin hora (para ese día)
        </label>

        {error && (
          <p role="alert" className="text-[0.8rem] text-rose-300">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onRemove(task.id)
              onClose()
            }}
            className="mr-auto flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[0.84rem] text-rose-300 transition-colors hover:bg-rose-400/15"
          >
            <Trash2 size={13} aria-hidden="true" />
            Eliminar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-white/20 px-3 py-1.5 text-[0.84rem] text-white/90 transition-colors hover:border-white/40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-amber-400 px-3.5 py-1.5 text-[0.84rem] font-semibold text-stone-950 transition-opacity hover:opacity-90"
          >
            Guardar
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}
