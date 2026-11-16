import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthScreen from './hud/AuthScreen'
import App from './App'
import Scene from './scene/Scene'

/**
 * La escena 3D se monta una sola vez y se queda detrás de todo: primero se ve
 * a través de la pantalla de acceso y, al entrar, a través del HUD.
 */
export default function Root() {
  const { user } = useAuth()
  const [zen, setZen] = useState(false)

  useEffect(() => {
    if (!user) setZen(false)
  }, [user])

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <div className="fixed inset-0">
        <Scene zen={Boolean(user) && zen} />
      </div>
      {user ? (
        <App key={user.id} zen={zen} setZen={setZen} />
      ) : (
        <>
          <div className="hud-shade pointer-events-none fixed inset-0" />
          {user === null && <AuthScreen />}
        </>
      )}
    </div>
  )
}
