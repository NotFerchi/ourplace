import { useEffect, useMemo, useState } from 'react'
import { Color } from 'three'

/**
 * false → la escena es siempre de noche, como la referencia (predeterminado).
 * true  → sigue el reloj de tu computadora: amanecer, día, atardecer y noche.
 * En ambos casos puedes probar una hora con  ?hour=13  en la URL.
 */
export const FOLLOW_CLOCK = false
const DEFAULT_HOUR = 22

/**
 * Ciclo de día: puntos clave por hora (0–24). Entre dos puntos se interpola.
 *  top/bottom → degradado del fondo (arriba y abajo de la pantalla)
 *  fog        → color de la niebla que esconde los bordes del mundo
 *  amb        → color de la luz ambiental
 *  sun        → color e intensidad de la luz principal (sol o luna)
 *  hemi       → intensidad de la luz ambiental
 *  night      → 0 de día, 1 de noche (ventanas, faroles, luciérnagas)
 */
// Noche índigo profundo: poca luz ambiental para que manden las luces cálidas
const NIGHT = { top: '#101c3a', bottom: '#0b1528', fog: '#0b1528', amb: '#5468c4', sun: '#8ea2ff', sunI: 1.15, hemi: 0.56, night: 1 }

const KEYFRAMES = [
  { h: 0, ...NIGHT },
  { h: 5, ...NIGHT },
  { h: 6.5, top: '#c98a86', bottom: '#4a4a78', fog: '#8a7088', amb: '#d8a79a', sun: '#ffc59a', sunI: 1.4, hemi: 0.7, night: 0.4 },
  { h: 9, top: '#9fc6e2', bottom: '#7fa6c6', fog: '#8fb4d0', amb: '#cfe6f5', sun: '#fff1d6', sunI: 2.3, hemi: 1.0, night: 0 },
  { h: 13, top: '#93c2e6', bottom: '#7aa7cc', fog: '#88b4d6', amb: '#d6ecfa', sun: '#ffffff', sunI: 2.7, hemi: 1.1, night: 0 },
  { h: 17, top: '#e2c9a0', bottom: '#8a9ab0', fog: '#b4ac9c', amb: '#e6d6bb', sun: '#ffe0b0', sunI: 2.2, hemi: 0.95, night: 0 },
  { h: 18.5, top: '#d67a58', bottom: '#3a3566', fog: '#7a4f5e', amb: '#d99a84', sun: '#ff9a5c', sunI: 1.5, hemi: 0.65, night: 0.45 },
  { h: 19.75, top: '#2c2a5e', bottom: '#111a36', fog: '#161f40', amb: '#6a62b8', sun: '#a99cf0', sunI: 0.85, hemi: 0.42, night: 0.9 },
  { h: 21, ...NIGHT },
  { h: 24, ...NIGHT },
]

const SUNRISE = 6
const SUNSET = 19.25

const cA = new Color()
const cB = new Color()
const mix = (a, b, t) => `#${cA.set(a).lerp(cB.set(b), t).getHexString()}`
const lerp = (a, b, t) => a + (b - a) * t

export function getDayCycle(hour) {
  let i = 0
  while (i < KEYFRAMES.length - 2 && hour >= KEYFRAMES[i + 1].h) i++
  const a = KEYFRAMES[i]
  const b = KEYFRAMES[i + 1]
  const t = Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h)))

  const isDay = hour >= SUNRISE && hour <= SUNSET
  const arc = isDay
    ? (hour - SUNRISE) / (SUNSET - SUNRISE)
    : ((hour < SUNRISE ? hour + 24 : hour) - SUNSET) / (24 - SUNSET + SUNRISE)
  const angle = Math.PI * arc

  return {
    hour,
    skyTop: mix(a.top, b.top, t),
    skyBottom: mix(a.bottom, b.bottom, t),
    fog: mix(a.fog, b.fog, t),
    ambient: mix(a.amb, b.amb, t),
    sunColor: mix(a.sun, b.sun, t),
    sunIntensity: lerp(a.sunI, b.sunI, t),
    hemiIntensity: lerp(a.hemi, b.hemi, t),
    night: lerp(a.night, b.night, t),
    isDay,
    // La luz cruza de derecha a izquierda, siempre algo de frente para que
    // el acantilado y el frente de la cabaña no queden en sombra
    lightPosition: [Math.cos(angle) * 10 - 2, Math.sin(angle) * 6 + 13, 16],
  }
}

const currentHour = () => {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}

/**
 * Hora que usa la escena: la de la URL, la fija nocturna o la del reloj real
 * (ver FOLLOW_CLOCK arriba). Ejemplo:  http://localhost:5173/?hour=13
 */
export function useDayCycle() {
  const override = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('hour')
    const n = raw === null ? NaN : parseFloat(raw)
    return Number.isFinite(n) ? ((n % 24) + 24) % 24 : null
  }, [])

  const fixed = override ?? (FOLLOW_CLOCK ? null : DEFAULT_HOUR)
  const [hour, setHour] = useState(() => fixed ?? currentHour())

  useEffect(() => {
    if (fixed !== null) return undefined
    const id = setInterval(() => setHour(currentHour()), 20000)
    return () => clearInterval(id)
  }, [fixed])

  return useMemo(() => getDayCycle(hour), [hour])
}
