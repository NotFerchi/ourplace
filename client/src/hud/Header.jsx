import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { fmtLongDate, fmtTime, greetingFor } from '../lib/date'
import { GLASS } from './glass'

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

/** Marca, estado de conexión, saludo según la hora, reloj y fecha. */
export default function Header({ now }) {
  const online = useOnline()
  const { user, logout } = useAuth()
  const name = user?.name ? `, ${user.name}` : ''

  return (
    <header className="px-1 pt-1 [text-shadow:0_1px_14px_rgb(0_0_0/0.5)]">
      <div className="flex items-center gap-3">
        <h1 className="text-4xl leading-none font-light tracking-tight">Our Place</h1>
        <span className={`${GLASS} flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs [text-shadow:none]`}>
          <span className={`size-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-white/40'}`} aria-hidden="true" />
          {online ? 'En línea' : 'Sin conexión'}
        </span>
        <button
          type="button"
          onClick={logout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className={`${GLASS} ml-auto flex size-8 cursor-pointer items-center justify-center rounded-full text-white/75 transition-colors [text-shadow:none] hover:text-white focus-visible:outline-2 focus-visible:outline-amber-200`}
        >
          <LogOut size={15} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-3 text-base leading-tight">
        {greetingFor(now)}
        {name}
      </p>
      <p className="mt-1 flex items-baseline gap-2 text-sm text-white/75">
        <span className="text-lg leading-none font-medium tabular-nums text-white">{fmtTime(now)}</span>
        <span className="first-letter:uppercase">{fmtLongDate(now)}</span>
      </p>
    </header>
  )
}
