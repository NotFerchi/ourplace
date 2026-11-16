import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Trash2 } from 'lucide-react'
import { CATEGORIES, PRIORITIES } from '../lib/constants'
import { fmtShortDate, fmtTime } from '../lib/date'
import { CARD } from './glass'

function dueLabel(task, showDate) {
  const due = new Date(task.dueAt)
  if (showDate) return task.dueHasTime ? `${fmtShortDate(due)}, ${fmtTime(due)}` : fmtShortDate(due)
  if (task.overdue) return task.dueHasTime ? `Atrasada desde ${fmtTime(due)}` : `Atrasada desde ${fmtShortDate(due)}`
  return task.dueHasTime ? fmtTime(due) : null
}

function TaskItem({ task, onToggle, onRemove, showDate = false }) {
  const cat = CATEGORIES[task.category]
  const pri = PRIORITIES[task.priority]
  const due = dueLabel(task, showDate)

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.2 }}
      className="group flex items-start gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.07]"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`}
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 grid size-[1.15rem] shrink-0 cursor-pointer place-items-center rounded-md border transition-colors ${
          task.done ? 'border-amber-400 bg-amber-400' : 'border-white/45 hover:border-white'
        }`}
      >
        {task.done && <Check size={12} strokeWidth={3.5} className="text-stone-950" aria-hidden="true" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-[0.9rem] leading-snug break-words ${task.done ? 'text-white/45 line-through' : 'text-white'}`}>
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-white/65">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: cat.color }} aria-hidden="true" />
            {cat.label}
          </span>
          {!task.done && <span style={{ color: pri.color }}>{pri.label}</span>}
          {due && !task.done && <span className={task.overdue ? 'text-rose-300' : ''}>{due}</span>}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(task.id)}
        aria-label={`Eliminar "${task.title}"`}
        className="mt-0.5 cursor-pointer rounded-md p-1 text-white/45 opacity-70 transition hover:text-rose-300 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
      >
        <Trash2 size={13} aria-hidden="true" />
      </button>
    </motion.li>
  )
}

/** Tareas de hoy: progreso, lista compacta y próximas entregas. El filtro vive en el dock. */
export default function TodayPanel({ today, upcoming, filter, onToggle, onRemove }) {
  const [showUpcoming, setShowUpcoming] = useState(false)

  const matches = (t) => filter === 'ALL' || t.category === filter
  const visible = today.filter(matches)
  const visibleUpcoming = upcoming.filter(matches)
  const done = today.filter((t) => t.done).length
  const pct = today.length ? Math.round((done / today.length) * 100) : 0

  return (
    <section className={`${CARD} flex min-h-0 flex-1 flex-col`} aria-labelledby="today-title">
      <header className="px-5 pt-4 pb-2.5">
        <div className="flex items-baseline justify-between">
          <h2 id="today-title" className="text-sm font-medium">
            Tareas de hoy
          </h2>
          <p className="text-xs tabular-nums text-white/70">
            {done} de {today.length}
            {filter !== 'ALL' && <span className="ml-1.5 text-amber-300">{CATEGORIES[filter].label}</span>}
          </p>
        </div>
        <div
          className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso del día"
        >
          <motion.div
            className="h-full rounded-full bg-amber-400"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </header>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {visible.length === 0 ? (
          <p className="px-2 py-3 text-sm leading-relaxed text-white/70">
            {today.length === 0
              ? 'No hay nada para hoy. Captura una tarea desde el dock o disfruta la vista.'
              : 'No hay tareas de esta categoría para hoy.'}
          </p>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {visible.map((t) => (
                <TaskItem key={t.id} task={t} onToggle={onToggle} onRemove={onRemove} />
              ))}
            </AnimatePresence>
          </ul>
        )}

        {visibleUpcoming.length > 0 && (
          <div className="mt-1.5 border-t border-white/12 pt-1.5">
            <button
              type="button"
              onClick={() => setShowUpcoming((v) => !v)}
              aria-expanded={showUpcoming}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-[0.82rem] text-white/80 transition-colors hover:text-white"
            >
              <span>Próximas ({visibleUpcoming.length})</span>
              <ChevronDown size={14} className={`transition-transform ${showUpcoming ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {showUpcoming && (
              <ul>
                <AnimatePresence initial={false}>
                  {visibleUpcoming.map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={onToggle} onRemove={onRemove} showDate />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
