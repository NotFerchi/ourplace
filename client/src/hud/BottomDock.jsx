import { useMemo } from 'react'
import { EyeOff, Plus } from 'lucide-react'
import { CATEGORIES } from '../lib/constants'
import { GLASS } from './glass'

const FILTERS = [
  { id: 'ALL', label: 'Todo', color: '#fbbf24' },
  { id: 'ESCUELA', label: 'Escuela', color: CATEGORIES.ESCUELA.color },
  { id: 'PROYECTO', label: 'Proyectos', color: CATEGORIES.PROYECTO.color },
  { id: 'PERSONAL', label: 'Personal', color: CATEGORIES.PERSONAL.color },
]

/** Dock flotante: filtro por categoría, Modo Zen y acceso a la captura rápida. */
export default function BottomDock({ filter, onFilter, onZen, onCapture, captureOpen }) {
  const isMac = useMemo(() => /Mac|iPhone|iPad/.test(navigator.platform), [])

  return (
    <nav
      className={`${GLASS} flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto rounded-full p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_18px_50px_rgba(0,0,0,0.3)]`}
      aria-label="Filtros y acciones"
    >
      <div className="flex items-center gap-0.5" role="group" aria-label="Filtrar tareas por categoría">
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => onFilter(f.id)}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.82rem] transition-colors ${
                active ? 'bg-white/20 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="size-1.5 rounded-full" style={{ background: f.color }} aria-hidden="true" />
              {f.label}
            </button>
          )
        })}
      </div>

      <span className="mx-1 h-5 w-px shrink-0 bg-white/20" aria-hidden="true" />

      <button
        type="button"
        onClick={onZen}
        title="Ocultar toda la interfaz (Esc)"
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.82rem] text-white/85 transition-colors hover:bg-white/10 hover:text-white"
      >
        <EyeOff size={14} aria-hidden="true" />
        Modo Zen
        <kbd className="rounded bg-white/15 px-1.5 text-[0.68rem] leading-relaxed">Esc</kbd>
      </button>

      <button
        type="button"
        data-capture-toggle
        onClick={onCapture}
        aria-expanded={captureOpen}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-amber-400 py-1.5 pr-2 pl-3 text-[0.82rem] font-semibold text-stone-950 shadow-[0_0_22px_rgba(251,191,36,0.45)] transition-transform hover:scale-[1.03]"
      >
        <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
        Captura rápida
        <kbd className="rounded-full bg-stone-950/15 px-2 text-[0.68rem] leading-relaxed font-medium">{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
      </button>
    </nav>
  )
}
