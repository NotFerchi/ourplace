import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

/**
 * Lista sincronizada con la API. Los cambios se ven al instante (optimista) y se
 * confirman en segundo plano; si el servidor rechaza uno, se vuelve a pedir la lista.
 * También se refresca al volver a la pestaña, para ver lo que cambiaste en otro dispositivo.
 */
export function useRemoteList(path, key) {
  const [items, setItems] = useState([])
  const ref = useRef(items)
  ref.current = items

  const refresh = useCallback(
    () =>
      api
        .get(path)
        .then((d) => setItems(d[key]))
        .catch(() => {}),
    [path, key],
  )

  useEffect(() => {
    refresh()
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  /** Aplica `change` a la lista local y ejecuta `request` contra la API. */
  const mutate = useCallback(
    (change, request) => {
      setItems(change)
      request().catch(() => refresh())
    },
    [refresh],
  )

  return { items, itemsRef: ref, mutate }
}
