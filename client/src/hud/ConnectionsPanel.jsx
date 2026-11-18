import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, LoaderCircle, RefreshCw, X } from 'lucide-react'
import { useIntegrations } from '../hooks/useIntegrations'
import { CATEGORIES } from '../lib/constants'
import { fmtAgo } from '../lib/date'
import { GLASS_DEEP } from './glass'

const FIELD =
  'w-full rounded-xl border border-white/15 bg-white/[0.07] px-2.5 py-1.5 text-[0.86rem] text-white placeholder:text-white/45'
const BTN =
  'flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 px-2.5 py-1.5 text-[0.8rem] text-white/90 transition-colors hover:border-amber-300 hover:text-white disabled:cursor-default disabled:opacity-50'

const STATUS = {
  connected: { label: 'Conectado', dot: 'bg-emerald-400' },
  disconnected: { label: 'Sin conectar', dot: 'bg-white/40' },
  error: { label: 'Error', dot: 'bg-rose-400' },
}

// Dónde sacar el token de cada servicio
const TOKEN_HELP = {
  clickup: 'En ClickUp: avatar → Settings → Apps → API Token (empieza con pk_).',
}

function ConnectionRow({ item, busy, onSync, onSave, onDisconnect }) {
  const [mode, setMode] = useState(null) // null | 'token' | 'disconnect'
  const [token, setToken] = useState('')
  const [deleteTasks, setDeleteTasks] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const status = STATUS[item.status]

  const report = async (promise) => setFeedback(await promise)

  const submitToken = async (e) => {
    e.preventDefault()
    if (!token.trim()) return
    const res = await onSave(item.provider, { token: token.trim(), category: item.category })
    setFeedback(res)
    if (res.ok) {
      setToken('')
      setMode(null)
    }
  }

  return (
    <li className="grid gap-2.5 rounded-2xl border border-white/12 bg-white/[0.04] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[0.92rem] font-medium">{item.label}</h3>
        <span className="flex items-center gap-1.5 text-xs text-white/80">
          {busy ? (
            <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
          )}
          {busy ? 'Trabajando…' : status.label}
        </span>
      </div>

      {item.status === 'error' && item.lastError && (
        <p role="alert" className="text-[0.8rem] leading-snug text-rose-300">
          {item.lastError}
        </p>
      )}
      {item.connected && (
        <p className="text-xs text-white/60">
          {item.lastSyncAt ? `Última sincronización ${fmtAgo(item.lastSyncAt)}` : 'Aún no se ha sincronizado'}
        </p>
      )}

      {item.connected && (
        <label className="flex items-center gap-2 text-xs text-white/70">
          Categoría de las tareas importadas
          <select
            value={item.category}
            disabled={busy}
            onChange={(e) => report(onSave(item.provider, { category: e.target.value }))}
            className={`${FIELD} w-auto py-1 text-[0.8rem]`}
          >
            {Object.entries(CATEGORIES).map(([id, c]) => (
              <option key={id} value={id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-wrap gap-1.5">
        {item.connected ? (
          <>
            <button type="button" disabled={busy} onClick={() => report(onSync(item.provider))} className={BTN}>
              <RefreshCw size={12} aria-hidden="true" />
              Sincronizar ahora
            </button>
            <button type="button" disabled={busy} onClick={() => setMode(mode === 'token' ? null : 'token')} className={BTN}>
              Cambiar token
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode(mode === 'disconnect' ? null : 'disconnect')}
              className={`${BTN} hover:border-rose-300 hover:text-rose-200`}
            >
              Desconectar
            </button>
          </>
        ) : (
          mode !== 'token' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('token')}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-[0.8rem] font-semibold text-stone-950 transition-opacity hover:opacity-90"
            >
              <Link2 size={12} aria-hidden="true" />
              Conectar
            </button>
          )
        )}
      </div>

      {mode === 'token' && (
        <form onSubmit={submitToken} className="grid gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Pega tu token personal"
            aria-label={`Token de ${item.label}`}
            autoComplete="off"
            autoFocus
            maxLength={500}
            className={FIELD}
          />
          {TOKEN_HELP[item.provider] && <p className="text-xs text-white/60">{TOKEN_HELP[item.provider]}</p>}
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={busy || !token.trim()}
              className="cursor-pointer rounded-xl bg-amber-400 px-3 py-1.5 text-[0.8rem] font-semibold text-stone-950 transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
            >
              Guardar y sincronizar
            </button>
            <button type="button" onClick={() => setMode(null)} className={BTN}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mode === 'disconnect' && (
        <div className="grid gap-2" role="group" aria-label={`Desconectar ${item.label}`}>
          <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-white/85">
            <input
              type="checkbox"
              checked={deleteTasks}
              onChange={(e) => setDeleteTasks(e.target.checked)}
              className="size-4 accent-rose-400"
            />
            Borrar también las tareas importadas de {item.label}
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setMode(null)
                await report(onDisconnect(item.provider, deleteTasks))
                setDeleteTasks(false)
              }}
              className="cursor-pointer rounded-xl bg-rose-400/25 px-3 py-1.5 text-[0.8rem] text-rose-100 transition-colors hover:bg-rose-400/35"
            >
              Desconectar
            </button>
            <button type="button" onClick={() => setMode(null)} className={BTN}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {feedback?.message && (
        <p className={`text-[0.8rem] ${feedback.ok ? 'text-emerald-300' : 'text-rose-300'}`} aria-live="polite">
          {feedback.message}
        </p>
      )}
    </li>
  )
}

/** Panel de cristal con una fila por servicio conectado o por conectar. Esc cierra (lo maneja App). */
export default function ConnectionsPanel({ onClose, onTasksChanged }) {
  const { integrations, busy, sync, save, disconnect } = useIntegrations(onTasksChanged)

  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center bg-stone-950/30 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="connections-title"
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        className={`${GLASS_DEEP} thin-scroll grid max-h-[calc(100dvh-1.5rem)] w-[min(30rem,calc(100vw-1.5rem))] gap-3 overflow-y-auto rounded-3xl p-5`}
      >
        <div className="flex items-center justify-between">
          <h2 id="connections-title" className="text-sm font-medium">
            Conexiones
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
        <p className="text-xs leading-relaxed text-white/65">
          Importa las tareas que tienes asignadas en otros servicios. Solo se leen: lo que marques como hecho aquí no
          cambia allá.
        </p>
        {integrations.length === 0 ? (
          <p className="text-sm text-white/60">Cargando…</p>
        ) : (
          <ul className="grid gap-2.5">
            {integrations.map((item) => (
              <ConnectionRow
                key={item.provider}
                item={item}
                busy={busy === item.provider}
                onSync={sync}
                onSave={save}
                onDisconnect={disconnect}
              />
            ))}
          </ul>
        )}
      </motion.section>
    </motion.div>
  )
}
