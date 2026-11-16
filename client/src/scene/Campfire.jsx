import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Particles from './Particles'
import { getTextures } from './textures'

const FLAMES = [
  { p: [0, 0.34, 0], s: [0.16, 0.5], c: '#ff7a2f' },
  { p: [0.07, 0.29, 0.04], s: [0.1, 0.34], c: '#ffb13b' },
  { p: [-0.06, 0.27, -0.03], s: [0.09, 0.3], c: '#ffd76a' },
]

/** Fogata pequeña con anillo de piedras. Siempre encendida; pesa más de noche. */
export function FirePit({ night, ...props }) {
  const tex = getTextures()
  const light = useRef()
  const flames = useRef([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const flicker = 0.86 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23.3) * 0.05 + Math.sin(t * 4.1) * 0.05
    if (light.current) light.current.intensity = (4 + night * 26) * flicker
    flames.current.forEach((mesh, i) => {
      if (!mesh) return
      mesh.scale.y = 1 + Math.sin(t * (9 + i * 3) + i) * 0.16
      mesh.rotation.z = Math.sin(t * (5 + i) + i * 2) * 0.09
    })
  })

  return (
    <group {...props}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, 0.09, Math.sin(a) * 0.4]} scale={[1, 0.75, 1]} rotation={[0, i * 1.3, 0]} castShadow>
            <sphereGeometry args={[0.14, 7, 5]} />
            <meshLambertMaterial map={tex.rock} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.03, 10]} />
        <meshLambertMaterial color="#1c1512" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, (i / 3) * Math.PI]}>
          <cylinderGeometry args={[0.05, 0.05, 0.56, 6]} />
          <meshLambertMaterial map={tex.bark} />
        </mesh>
      ))}
      {FLAMES.map((f, i) => (
        <mesh key={i} ref={(el) => (flames.current[i] = el)} position={f.p}>
          <coneGeometry args={[f.s[0], f.s[1], 6]} />
          <meshLambertMaterial color={f.c} emissive={f.c} emissiveIntensity={2.4} />
        </mesh>
      ))}
      <Particles count={14} position={[0, 0.95, 0]} scale={[0.5, 1.5, 0.5]} size={2.4} speed={1.4} rise={0.45} color="#ffb454" opacity={0.9} glow={2.2} />
      <pointLight ref={light} position={[0, 0.65, 0]} color="#ff9e44" intensity={6} distance={14} decay={2} />
    </group>
  )
}
