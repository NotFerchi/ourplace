import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

// Ángulo de maqueta: desde el frente, girado hacia la izquierda y mirando hacia abajo
const AZIMUTH = -0.38
const PITCH = 0.56
const orbit = (target, distance) =>
  new Vector3(
    target.x + Math.sin(AZIMUTH) * Math.cos(PITCH) * distance,
    target.y + Math.sin(PITCH) * distance,
    target.z + Math.cos(AZIMUTH) * Math.cos(PITCH) * distance,
  )

const HUD_TARGET = new Vector3(-0.6, -1.0, -0.4)
const ZEN_TARGET = new Vector3(-0.6, -0.9, -0.5)
// La escena llena toda la pantalla; en Zen la cámara se acerca un poco más
const VIEWS = {
  hud: { position: orbit(HUD_TARGET, 39), target: HUD_TARGET },
  zen: { position: orbit(ZEN_TARGET, 35), target: ZEN_TARGET },
}
export const INITIAL_CAMERA = VIEWS.hud.position.toArray()

const RIGHT = new Vector3(Math.cos(AZIMUTH), 0, Math.sin(AZIMUTH))

/**
 * Paralaje sutil con el mouse + una deriva lenta para que la escena nunca esté quieta.
 * En Modo Zen la cámara se acerca.
 */
export default function CameraRig({ zen }) {
  const pointer = useRef({ x: 0, y: 0 })
  const goal = useMemo(() => new Vector3(), [])
  const target = useMemo(() => VIEWS.hud.target.clone(), [])
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    // Se escucha en window porque el HUD cubre el canvas
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const view = zen ? VIEWS.zen : VIEWS.hud
    const portrait = state.size.width < state.size.height
    const k = reduced ? 0 : 1
    const ease = 1 - Math.exp(-delta * 2)

    // En vertical la cámara se aleja para que quepa la base completa
    goal.copy(view.position).sub(view.target).multiplyScalar(portrait ? 1.7 : 1).add(view.target)
    goal.addScaledVector(RIGHT, k * (pointer.current.x * 0.9 + Math.sin(t * 0.15) * 0.25))
    goal.y += k * (-pointer.current.y * 0.45 + Math.sin(t * 0.21) * 0.1)

    state.camera.position.lerp(goal, ease)
    target.lerp(view.target, ease)
    state.camera.lookAt(target)
  })

  return null
}
