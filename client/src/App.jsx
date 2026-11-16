import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { useBlocks } from './hooks/useBlocks'
import { useNow } from './hooks/useNow'
import { useTasks } from './hooks/useTasks'
import AgendaPanel from './hud/AgendaPanel'
import BottomDock from './hud/BottomDock'
import { GLASS } from './hud/glass'
import Header from './hud/Header'
import NextUpCard from './hud/NextUpCard'
import QuickCapture from './hud/QuickCapture'
import TodayPanel from './hud/TodayPanel'
import WeekStrip from './hud/WeekStrip'
import { splitTasks } from './lib/tasks'

const isTyping = (el) => el && (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.closest('form'))
const EASE = [0.2, 0.8, 0.2, 1]

/** HUD de productividad. La escena 3D vive en Root (no se recrea al iniciar sesión). */
export default function App({ zen, setZen }) {
  const [filter, setFilter] = useState('ALL')
  const [captureOpen, setCaptureOpen] = useState(false)
  const now = useNow()
  const { tasks, addTask, toggleTask, removeTask } = useTasks()
  const { blocks, addBlock, removeBlock } = useBlocks()

  const split = useMemo(() => splitTasks(tasks, now), [tasks, now])
  const closeCapture = useCallback(() => setCaptureOpen(false), [])

  // El listener global lee el estado más reciente sin volver a registrarse
  const captureRef = useRef(captureOpen)
  captureRef.current = captureOpen

  // Atajos globales: Ctrl/Cmd + K → captura rápida · Esc → Modo Zen
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setZen(false)
        setCaptureOpen(true)
        return
      }
      if (e.key === 'Escape') {
        // Esc primero cierra la captura o suelta el campo activo; si no, alterna el Modo Zen
        if (captureRef.current) {
          setCaptureOpen(false)
        } else if (isTyping(document.activeElement)) {
          document.activeElement.blur()
        } else {
          setZen((z) => !z)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setZen])

  const enterZen = () => {
    setCaptureOpen(false)
    setZen(true)
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <motion.div
        className="hud-shade pointer-events-none fixed inset-0"
        animate={{ opacity: zen ? 0 : 1 }}
        transition={{ duration: 0.8 }}
      />

      <AnimatePresence>
        {!zen && (
          <motion.div
            key="hud"
            className="thin-scroll pointer-events-none absolute inset-0 grid grid-cols-1 content-start gap-4 overflow-y-auto p-4 pb-24 sm:p-5 sm:pb-24 lg:grid-cols-[20.5rem_1fr_20.5rem] lg:content-stretch lg:overflow-hidden lg:pb-5"
            initial="hidden"
            animate="shown"
            exit="hidden"
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } } }}
          >
            {/* Columna izquierda: marca, semana y tareas */}
            <motion.aside
              className="pointer-events-auto flex flex-col gap-3 lg:min-h-0"
              variants={{ hidden: { opacity: 0, x: -28 }, shown: { opacity: 1, x: 0 } }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <Header now={now} />
              <WeekStrip now={now} tasks={tasks} />
              <div className="flex h-[22rem] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink">
                <TodayPanel today={split.today} upcoming={split.upcoming} filter={filter} onToggle={toggleTask} onRemove={removeTask} />
              </div>
            </motion.aside>

            {/* Centro libre: ahí viven la cabaña, la fogata y el puente */}
            <div className="hidden lg:block" aria-hidden="true" />

            {/* Columna derecha: lo próximo y la agenda */}
            <motion.aside
              className="pointer-events-auto flex flex-col gap-3 lg:min-h-0"
              variants={{ hidden: { opacity: 0, x: 28 }, shown: { opacity: 1, x: 0 } }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <NextUpCard tasks={tasks} blocks={blocks} />
              <div className="flex h-[24rem] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink">
                <AgendaPanel blocks={blocks} now={now} onAdd={addBlock} onRemove={removeBlock} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock y captura rápida, centrados abajo */}
      <AnimatePresence>
        {!zen && (
          <motion.div
            key="dock"
            className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex flex-col items-center gap-3 sm:bottom-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
          >
            <div className="pointer-events-auto">
              <AnimatePresence>
                {captureOpen && <QuickCapture key="capture" onAdd={addTask} onClose={closeCapture} />}
              </AnimatePresence>
            </div>
            <div className="pointer-events-auto">
              <BottomDock
                filter={filter}
                onFilter={setFilter}
                onZen={enterZen}
                onCapture={() => setCaptureOpen((v) => !v)}
                captureOpen={captureOpen}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zen && (
          <motion.button
            key="zen-exit"
            type="button"
            onClick={() => setZen(false)}
            className={`${GLASS} absolute right-5 bottom-5 flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm text-white/85 transition-colors hover:text-white`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Eye size={16} aria-hidden="true" />
            Mostrar interfaz
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-xs">Esc</kbd>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
