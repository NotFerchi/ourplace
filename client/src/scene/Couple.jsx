import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Shape } from 'three'
import { getTextures, tiled } from './textures'

// Sombreado suave (sin facetas), como los personajes de la época
const Mat = ({ color }) => <meshLambertMaterial color={color} />

function Person({ position, palette, longHair = false, lean = 0, phase = 0 }) {
  const torso = useRef()
  const head = useRef()

  // Animación "idle": respiración y un leve balanceo de cabeza
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    if (torso.current) torso.current.scale.y = 1 + Math.sin(t * 1.4) * 0.018
    if (head.current) {
      head.current.rotation.z = lean * 1.6 + Math.sin(t * 0.5) * 0.035
      head.current.rotation.x = Math.sin(t * 0.37) * 0.03
    }
  })

  return (
    <group position={position} rotation={[0, 0, lean]}>
      <mesh ref={torso} position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.4, 4, 10]} />
        <Mat color={palette.top} />
      </mesh>

      {/* Brazos descansando sobre las piernas */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.25, 0.86, 0.1]} rotation={[-0.55, 0, side * 0.12]} castShadow>
          <capsuleGeometry args={[0.062, 0.36, 3, 8]} />
          <Mat color={palette.top} />
        </mesh>
      ))}

      {/* Cabeza (pivote en el cuello) */}
      <group ref={head} position={[0, 1.3, 0]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <sphereGeometry args={[0.18, 12, 9]} />
          <Mat color={palette.skin} />
        </mesh>
        <mesh position={[0, 0.18, -0.025]} castShadow>
          <sphereGeometry args={[0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
          <Mat color={palette.hair} />
        </mesh>
        {longHair && (
          <mesh position={[0, -0.04, -0.13]} castShadow>
            <boxGeometry args={[0.33, 0.52, 0.13]} />
            <Mat color={palette.hair} />
          </mesh>
        )}
      </group>

      {/* Piernas: muslos hacia el frente, espinillas hacia abajo */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.11, 0, 0]}>
          <mesh position={[0, 0.58, 0.24]} castShadow>
            <boxGeometry args={[0.15, 0.15, 0.46]} />
            <Mat color={palette.bottom} />
          </mesh>
          <mesh position={[0, 0.32, 0.44]} castShadow>
            <boxGeometry args={[0.13, 0.46, 0.13]} />
            <Mat color={palette.bottom} />
          </mesh>
          <mesh position={[0, 0.06, 0.5]} castShadow>
            <boxGeometry args={[0.14, 0.11, 0.26]} />
            <Mat color={palette.shoes} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Corazón que flota sobre ellos. */
function Heart(props) {
  const ref = useRef()
  const shape = useMemo(() => {
    const s = new Shape()
    s.moveTo(0, 0.25)
    s.bezierCurveTo(0, 0.25, -0.05, 0.5, -0.25, 0.5)
    s.bezierCurveTo(-0.55, 0.5, -0.55, 0.15, -0.55, 0.15)
    s.bezierCurveTo(-0.55, -0.05, -0.35, -0.27, 0, -0.45)
    s.bezierCurveTo(0.35, -0.27, 0.55, -0.05, 0.55, 0.15)
    s.bezierCurveTo(0.55, 0.15, 0.55, 0.5, 0.25, 0.5)
    s.bezierCurveTo(0.1, 0.5, 0, 0.25, 0, 0.25)
    return s
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.y = Math.sin(t * 1.3) * 0.07
    ref.current.rotation.y = Math.sin(t * 0.6) * 0.5
    ref.current.scale.setScalar(0.24 * (1 + Math.sin(t * 2.6) * 0.05))
  })

  return (
    <group {...props}>
      <mesh ref={ref} scale={0.24}>
        <extrudeGeometry args={[shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }]} />
        <meshLambertMaterial color="#ff5d73" emissive="#ff3355" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

/** Tronco acostado que sirve de banca. */
export function LogBench({ children, ...props }) {
  const tex = getTextures()
  const bark = useMemo(() => tiled(tex.bark, 2, 1), [tex])
  return (
    <group {...props}>
      <mesh position={[0, 0.27, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.27, 0.27, 1.8, 12]} />
        <meshLambertMaterial map={bark} />
      </mesh>
      {[-0.905, 0.905].map((x) => (
        <mesh key={x} position={[x, 0.27, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.23, 0.23, 0.02, 12]} />
          <meshLambertMaterial color="#c9a57a" />
        </mesh>
      ))}
      {children}
    </group>
  )
}

/** Los dos, sentados juntos en un tronco mirando la fogata. */
export default function Couple(props) {
  return (
    <LogBench {...props}>
      <Person
        position={[-0.25, 0.04, 0.05]}
        palette={{ top: '#3d5a80', bottom: '#2b3040', skin: '#e2b08c', hair: '#2a1d16', shoes: '#ece6da' }}
        lean={-0.05}
      />
      <Person
        position={[0.25, 0.04, 0.05]}
        palette={{ top: '#d98f6c', bottom: '#4a4e69', skin: '#efc3a2', hair: '#4a2c1c', shoes: '#f3ead8' }}
        longHair
        lean={0.13}
        phase={1.8}
      />
      <Heart position={[0, 2.2, 0]} />
    </LogBench>
  )
}
