import { getTextures } from './textures'

/** Naranja cálido de todas las luces del campamento. */
export const WARM = '#ff9e44'

/** Barandal entre dos puntos [x, z]: postes + dos travesaños. */
export function Rail({ a, b, base = 0, height = 0.8, spacing = 1.1, thickness = 0.09 }) {
  const tex = getTextures()
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len = Math.hypot(dx, dz)
  const rot = Math.atan2(dx, dz)
  const n = Math.max(1, Math.round(len / spacing))
  return (
    <group>
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[a[0] + (dx * i) / n, base + height / 2, a[1] + (dz * i) / n]} castShadow>
          <boxGeometry args={[thickness, height, thickness]} />
          <meshLambertMaterial map={tex.deck} />
        </mesh>
      ))}
      {[1, 0.5].map((k) => (
        <mesh key={k} position={[(a[0] + b[0]) / 2, base + height * k, (a[1] + b[1]) / 2]} rotation={[0, rot, 0]} castShadow>
          <boxGeometry args={[thickness * 0.7, thickness * 0.7, len]} />
          <meshLambertMaterial map={tex.deck} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Poste de madera con farol. Todos brillan (y el Bloom los hace resplandecer);
 * los que llevan `light` además proyectan luz naranja real sobre lo que tienen
 * cerca. Cada luz real cuesta rendimiento: si va lento, quítale `light` a algunos.
 */
export function LanternPost({ position, night, height = 0.85, light = false, range = 7.5 }) {
  const tex = getTextures()
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[0.15, height, 0.15]} />
        <meshLambertMaterial map={tex.siding} color="#c9b8a6" />
      </mesh>
      <mesh position={[0, height + 0.11, 0]}>
        <boxGeometry args={[0.2, 0.22, 0.2]} />
        <meshLambertMaterial color="#ffd9a0" emissive={WARM} emissiveIntensity={0.6 + night * 3.6} />
      </mesh>
      <mesh position={[0, height + 0.26, 0]}>
        <boxGeometry args={[0.26, 0.06, 0.26]} />
        <meshLambertMaterial map={tex.siding} />
      </mesh>
      {light && <pointLight position={[0, height + 0.25, 0]} color={WARM} intensity={2 + night * 11} distance={range} decay={2} />}
    </group>
  )
}
