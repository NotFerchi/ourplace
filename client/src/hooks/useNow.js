import { useEffect, useState } from 'react'

/** Fecha actual que se refresca cada `intervalMs` (reloj, saludo, línea de "ahora"). */
export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
