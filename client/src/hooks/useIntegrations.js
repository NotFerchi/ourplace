import { useCallback, useState } from 'react'
import { api } from '../lib/api'
import { useRemoteList } from './useRemoteList'

/**
 * Conexiones con servicios externos (ClickUp, …). El servidor nunca manda tokens.
 * Cada acción devuelve { ok, message } para mostrarlo en el panel; `onTasksChanged`
 * vuelve a pedir las tareas tras importar o borrar.
 */
export function useIntegrations(onTasksChanged) {
  const { items: integrations, refresh } = useRemoteList('/integrations', 'integrations')
  const [busy, setBusy] = useState(null) // proveedor con una acción en curso

  const run = useCallback(
    async (provider, request, describe) => {
      setBusy(provider)
      try {
        const data = await request()
        return { ok: true, message: describe?.(data) ?? '' }
      } catch (err) {
        return { ok: false, message: err.message }
      } finally {
        await refresh()
        setBusy(null)
      }
    },
    [refresh],
  )

  const sync = useCallback(
    (provider) =>
      run(
        provider,
        () => api.post(`/integrations/${provider}/sync`),
        ({ result }) => {
          onTasksChanged()
          if (!result.ok) throw new Error(result.error)
          return result.created ? `${result.created} nuevas, ${result.updated} actualizadas.` : `${result.updated} actualizadas.`
        },
      ),
    [run, onTasksChanged],
  )

  /** Guarda token y/o categoría. Con token nuevo, sincroniza enseguida. */
  const save = useCallback(
    async (provider, { token, category }) => {
      const saved = await run(provider, () => api.put(`/integrations/${provider}`, { token: token || undefined, category }))
      if (saved.ok && token) return sync(provider)
      return saved
    },
    [run, sync],
  )

  const disconnect = useCallback(
    (provider, deleteTasks) =>
      run(
        provider,
        () => api.del(`/integrations/${provider}${deleteTasks ? '?deleteTasks=true' : ''}`),
        ({ deletedTasks }) => {
          if (deleteTasks) onTasksChanged()
          return deleteTasks ? `Desconectado. Se borraron ${deletedTasks} tareas importadas.` : 'Desconectado.'
        },
      ),
    [run, onTasksChanged],
  )

  return { integrations, busy, sync, save, disconnect }
}
