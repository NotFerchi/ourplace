import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { GLASS_DEEP } from './glass'

const FIELD =
  'w-full rounded-xl border border-white/15 bg-white/[0.07] px-3.5 py-2.5 text-[0.95rem] text-white placeholder:text-white/40 outline-none transition-colors focus:border-amber-300/70 focus:bg-white/[0.1]'

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-white/75">{label}</span>
      <input className={FIELD} required {...props} />
    </label>
  )
}

/** Entrar o crear cuenta. La escena 3D se ve detrás, a través del cristal. */
export default function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [inviteRequired, setInviteRequired] = useState(false)
  const isRegister = mode === 'register'

  useEffect(() => {
    api
      .get('/auth/config')
      .then((d) => setInviteRequired(Boolean(d.inviteRequired)))
      .catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    setError('')
    try {
      if (isRegister) await register({ name: f.name, email: f.email, password: f.password, inviteCode: f.inviteCode ?? '' })
      else await login(f.email, f.password)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const switchMode = (next) => {
    setMode(next)
    setError('')
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto p-4">
      <motion.main
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        className={`${GLASS_DEEP} my-auto w-[min(26rem,100%)] rounded-3xl p-7`}
      >
        <h1 className="text-4xl leading-none font-light tracking-tight [text-shadow:0_1px_14px_rgb(0_0_0/0.5)]">Our Place</h1>
        <p className="mt-3 text-white/75">
          {isRegister ? 'Crea tu cuenta y únete a nuestro lugar.' : 'Entra a nuestro lugar.'}
        </p>

        <form key={mode} onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {isRegister && <Field label="Nombre" name="name" type="text" autoComplete="given-name" maxLength={40} />}
          <Field label="Correo" name="email" type="email" autoComplete="email" />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : undefined}
          />
          {isRegister && (
            <>
              <p className="-mt-2 text-xs text-white/55">Mínimo 8 caracteres.</p>
              {inviteRequired && (
                <Field label="Código de invitación" name="inviteCode" type="text" autoComplete="off" />
              )}
            </>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/15 px-3.5 py-2.5 text-sm text-rose-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400/90 px-4 py-2.5 font-medium text-stone-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-wait disabled:opacity-70"
          >
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isRegister ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-white/70">
          {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
            className="cursor-pointer text-amber-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-amber-200"
          >
            {isRegister ? 'Entrar' : 'Crear cuenta'}
          </button>
        </p>
      </motion.main>
    </div>
  )
}
