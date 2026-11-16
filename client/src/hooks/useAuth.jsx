import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { seedTasks } from '../lib/tasks'

const AuthContext = createContext(null)

/** Sesión del usuario: undefined = comprobando, null = sin sesión, objeto = dentro. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    let off = false
    api
      .get('/auth/me')
      .then((d) => !off && setUser(d.user))
      .catch(() => !off && setUser(null))
    const onUnauthorized = () => setUser(null)
    window.addEventListener('myplace:unauthorized', onUnauthorized)
    return () => {
      off = true
      window.removeEventListener('myplace:unauthorized', onUnauthorized)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password })
    setUser(d.user)
  }, [])

  const register = useCallback(async (fields) => {
    const d = await api.post('/auth/register', fields)
    // Cuenta nueva: deja las tareas de bienvenida (mismas que traía la versión local)
    await Promise.allSettled(seedTasks().map((t) => api.post('/tasks', t)))
    setUser(d.user)
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
