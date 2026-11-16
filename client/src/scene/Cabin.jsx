import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Shape } from 'three'
import { LanternPost, Rail, WARM } from './parts'
import { getTextures, tiled } from './textures'

// Perfil del frente (x, y): techo asimétrico, con la cumbrera cargada a la derecha.
//        R
//       /  \
//      /    C
//     D     |
//     A-----B
const A = [-3.0, 0]
const B = [2.6, 0]
const C = [2.6, 2.7]
const R = [0.8, 5.0]
const Dp = [-3.0, 1.5]
const Z0 = -2.4
const Z1 = 2.4
const DEPTH = Z1 - Z0
const DECK_Y = 0.45
const DECK_Z1 = 4.8
const BEAM = '#3a2a20'

// Altura del techo sobre cada x, para cortar las vigas del ventanal a la medida
const roofY = (x) => (x <= R[0] ? Dp[1] + ((R[1] - Dp[1]) / (R[0] - Dp[0])) * (x - Dp[0]) : R[1] + ((C[1] - R[1]) / (C[0] - R[0])) * (x - R[0]))

const shapeOf = (points) => {
  const s = new Shape()
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  return s
}

function Smoke() {
  const puffs = useRef([])
  useFrame(({ clock }) => {
    puffs.current.forEach((mesh, i) => {
      if (!mesh) return
      const life = (clock.elapsedTime * 0.12 + i / 6) % 1
      mesh.position.set(Math.sin(life * 4 + i) * 0.2 + life * 0.6, life * 3, 0)
      mesh.scale.setScalar(0.16 + life * 0.45)
      mesh.material.opacity = (1 - life) * 0.35
    })
  })
  return (
    <group>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} ref={(el) => (puffs.current[i] = el)}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshLambertMaterial color="#aab3c6" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Una de las aguas del techo: lámina delgada y oscura con alero largo. */
function RoofSlope({ from, to, map, overhang = 0.6 }) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  return (
    <group position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.09, 0.25]} rotation={[0, 0, Math.atan2(dy, dx)]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[len + overhang * 2, 0.12, DEPTH + 1.5]} />
        <meshLambertMaterial map={map} color="#9aa0ac" />
      </mesh>
      {/* Canto de madera visto por debajo del alero */}
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[len + overhang * 2 - 0.1, 0.07, DEPTH + 1.4]} />
        <meshLambertMaterial color={BEAM} />
      </mesh>
    </group>
  )
}

/** Viga de madera oscura sobre el ventanal. */
function Beam({ position, size, rotation }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={size} />
      <meshLambertMaterial color={BEAM} />
    </mesh>
  )
}

function Chair({ position, rotation }) {
  const tex = getTextures()
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.6, 0.12, 0.6]} />
        <meshLambertMaterial map={tex.deck} />
      </mesh>
      <mesh position={[0, 0.6, -0.27]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.62, 0.1]} />
        <meshLambertMaterial map={tex.deck} />
      </mesh>
      <mesh position={[0, 0.38, 0.02]}>
        <boxGeometry args={[0.48, 0.1, 0.46]} />
        <meshLambertMaterial color="#d8cdb8" />
      </mesh>
    </group>
  )
}

/** Sala visible a través del cristal: sillón, tapete, mesa, librero, lámparas y chimenea. */
function Interior({ night }) {
  const tex = getTextures()
  const on = 0.6 + night * 2.2
  return (
    <group>
      <mesh position={[-0.2, 0.06, 0]} receiveShadow>
        <boxGeometry args={[5.5, 0.12, DEPTH - 0.1]} />
        <meshLambertMaterial map={tex.deck} color="#e8c9a0" />
      </mesh>
      <mesh position={[0.1, 0.135, 0.5]}>
        <boxGeometry args={[2.8, 0.03, 1.9]} />
        <meshLambertMaterial color="#a8442f" />
      </mesh>

      {/* Sillón en L */}
      <group position={[-0.5, 0.12, -0.7]}>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[2.0, 0.4, 0.8]} />
          <meshLambertMaterial color="#e9dcc4" />
        </mesh>
        <mesh position={[0, 0.58, -0.32]}>
          <boxGeometry args={[2.0, 0.5, 0.2]} />
          <meshLambertMaterial color="#dccdb2" />
        </mesh>
        <mesh position={[-0.8, 0.22, 0.7]}>
          <boxGeometry args={[0.6, 0.4, 0.8]} />
          <meshLambertMaterial color="#e9dcc4" />
        </mesh>
        <mesh position={[0.5, 0.5, -0.05]}>
          <boxGeometry args={[0.4, 0.32, 0.16]} />
          <meshLambertMaterial color="#d98f3c" />
        </mesh>
      </group>
      <mesh position={[0.5, 0.32, 0.6]}>
        <cylinderGeometry args={[0.42, 0.42, 0.08, 10]} />
        <meshLambertMaterial map={tex.deck} />
      </mesh>

      {/* Librero al fondo */}
      <mesh position={[1.6, 1.0, Z0 + 0.3]}>
        <boxGeometry args={[1.4, 1.9, 0.3]} />
        <meshLambertMaterial map={tex.siding} color="#d6c2aa" />
      </mesh>
      {[0.5, 1.0, 1.5].map((y, k) => (
        <mesh key={y} position={[1.6, y, Z0 + 0.47]}>
          <boxGeometry args={[1.2, 0.26, 0.04]} />
          <meshLambertMaterial color={['#c8553d', '#4f7b6b', '#d9a441'][k]} />
        </mesh>
      ))}

      {/* Lámpara de pie */}
      <mesh position={[1.75, 0.8, -0.3]}>
        <cylinderGeometry args={[0.025, 0.025, 1.4, 5]} />
        <meshLambertMaterial color="#1c1a18" />
      </mesh>
      <mesh position={[1.75, 1.6, -0.3]}>
        <cylinderGeometry args={[0.16, 0.26, 0.34, 10]} />
        <meshLambertMaterial color="#ffe9bf" emissive={WARM} emissiveIntensity={on} />
      </mesh>
      {/* Lámpara colgante */}
      <mesh position={[0.3, 3.75, 0.3]}>
        <cylinderGeometry args={[0.012, 0.012, 1.6, 4]} />
        <meshLambertMaterial color="#1c1a18" />
      </mesh>
      <mesh position={[0.3, 2.9, 0.3]}>
        <sphereGeometry args={[0.24, 12, 9]} />
        <meshLambertMaterial color="#fff2d2" emissive={WARM} emissiveIntensity={on * 1.15} />
      </mesh>

      {/* Chimenea interior con fuego */}
      <mesh position={[-1.9, 0.75, -1.0]}>
        <boxGeometry args={[1.05, 1.3, 0.7]} />
        <meshLambertMaterial map={tex.wall} />
      </mesh>
      <mesh position={[-1.9, 0.5, -0.63]}>
        <boxGeometry args={[0.55, 0.45, 0.05]} />
        <meshLambertMaterial color="#ffb060" emissive="#ff7a2f" emissiveIntensity={1 + night * 2.2} />
      </mesh>

      {/* La luz de la sala: ilumina la madera por dentro y se asoma al deck */}
      <pointLight position={[0.3, 2.3, 0.4]} color={WARM} intensity={8 + night * 30} distance={10} decay={2} />
    </group>
  )
}

/**
 * Cabaña moderna de montaña: techo oscuro asimétrico, chimenea de piedra,
 * frente de cristal con vigas y sala iluminada, pilares de piedra y ala lateral.
 */
export default function Cabin({ night, ...props }) {
  const tex = getTextures()
  const maps = useMemo(
    () => ({
      siding: tiled(tex.siding, 0.3, 0.3),
      wall: tiled(tex.siding, 1.6, 0.9),
      wing: tiled(tex.siding, 1.2, 0.6),
      pier: tiled(tex.wall, 0.4, 1.2),
      chimney: tiled(tex.wall, 0.7, 3.6),
      roof: tiled(tex.roof, 1.4, 1),
      deck: tiled(tex.deck, 3, 1),
      step: tiled(tex.deck, 0.8, 0.3),
    }),
    [tex],
  )
  const gable = useMemo(() => shapeOf([A, B, C, R, Dp]), [])
  const glow = 0.35 + night * 1.6
  const ZB = Z1 + 0.07 // plano de las vigas, justo delante del cristal

  const leftAngle = Math.atan2(R[1] - Dp[1], R[0] - Dp[0])
  const rightAngle = Math.atan2(C[1] - R[1], C[0] - R[0])
  const leftLen = Math.hypot(R[0] - Dp[0], R[1] - Dp[1])
  const rightLen = Math.hypot(C[0] - R[0], C[1] - R[1])

  return (
    <group {...props}>
      {/* Muros: fondo con la forma del techo y dos laterales */}
      <mesh position={[0, 0, Z0 + 0.04]} castShadow>
        <shapeGeometry args={[gable]} />
        <meshLambertMaterial map={maps.siding} side={DoubleSide} color="#f0d9bd" />
      </mesh>
      <mesh position={[A[0] + 0.07, Dp[1] / 2, 0]} castShadow>
        <boxGeometry args={[0.14, Dp[1], DEPTH]} />
        <meshLambertMaterial map={maps.wall} />
      </mesh>
      <mesh position={[B[0] - 0.07, C[1] / 2, 0]} castShadow>
        <boxGeometry args={[0.14, C[1], DEPTH]} />
        <meshLambertMaterial map={maps.wall} />
      </mesh>

      <Interior night={night} />

      {/* Cristal: casi transparente, con un tinte ámbar */}
      <mesh position={[0, 0, Z1]}>
        <shapeGeometry args={[gable]} />
        <meshLambertMaterial color="#ffd9a0" emissive={WARM} emissiveIntensity={0.05 + night * 0.25} transparent opacity={0.16} depthWrite={false} side={DoubleSide} />
      </mesh>

      {/* Vigas de madera oscura cruzando el ventanal */}
      <Beam position={[(A[0] + B[0]) / 2, 0.1, ZB]} size={[B[0] - A[0], 0.2, 0.14]} />
      <Beam position={[(A[0] + B[0]) / 2, 2.3, ZB]} size={[B[0] - A[0], 0.14, 0.14]} />
      {[-1.5, 0.8, 1.85].map((x) => (
        <Beam key={x} position={[x, roofY(x) / 2, ZB]} size={[0.14, roofY(x), 0.14]} />
      ))}
      <Beam position={[-0.35, 1.2, ZB]} size={[0.09, 2.2, 0.1]} />
      <Beam position={[(Dp[0] + R[0]) / 2, (Dp[1] + R[1]) / 2 - 0.08, ZB]} size={[leftLen, 0.2, 0.16]} rotation={[0, 0, leftAngle]} />
      <Beam position={[(R[0] + C[0]) / 2, (R[1] + C[1]) / 2 - 0.08, ZB]} size={[rightLen, 0.2, 0.16]} rotation={[0, 0, rightAngle]} />

      {/* Ventana lateral derecha */}
      <mesh position={[B[0] + 0.03, 1.45, -0.3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.8, 1.5]} />
        <meshLambertMaterial map={tex.window} emissive="#ffffff" emissiveMap={tex.window} emissiveIntensity={glow} />
      </mesh>

      {/* Pilares de piedra en las esquinas del frente */}
      <mesh position={[A[0] + 0.12, 0.85, Z1 - 0.1]} castShadow>
        <boxGeometry args={[0.5, 1.7, 0.55]} />
        <meshLambertMaterial map={maps.pier} />
      </mesh>
      <mesh position={[B[0] - 0.12, 1.45, Z1 - 0.1]} castShadow>
        <boxGeometry args={[0.5, 2.9, 0.55]} />
        <meshLambertMaterial map={maps.pier} />
      </mesh>

      <RoofSlope from={Dp} to={R} map={maps.roof} />
      <RoofSlope from={R} to={C} map={maps.roof} overhang={0.5} />

      {/* Ala lateral baja con su propio techo */}
      <mesh position={[-4.0, 0.75, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 1.5, 3.0]} />
        <meshLambertMaterial map={maps.wing} />
      </mesh>
      <mesh position={[-4.05, 1.62, -0.5]} rotation={[0, 0, 0.16]} castShadow>
        <boxGeometry args={[2.6, 0.12, 3.7]} />
        <meshLambertMaterial map={maps.roof} color="#9aa0ac" />
      </mesh>
      <mesh position={[-4.0, 0.85, 1.02]}>
        <planeGeometry args={[0.7, 0.8]} />
        <meshLambertMaterial map={tex.window} emissive="#ffffff" emissiveMap={tex.window} emissiveIntensity={glow} />
      </mesh>

      {/* Chimenea de piedra + humo */}
      <mesh position={[-1.9, 3.2, -1.2]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 6.4, 1.0]} />
        <meshLambertMaterial map={maps.chimney} />
      </mesh>
      <mesh position={[-1.9, 6.46, -1.2]}>
        <boxGeometry args={[1.18, 0.14, 1.18]} />
        <meshLambertMaterial map={tex.wall} color="#777" />
      </mesh>
      <group position={[-1.9, 6.7, -1.2]}>
        <Smoke />
      </group>

      {/* Deck */}
      <mesh position={[0.9, DECK_Y - 0.12, (Z1 + DECK_Z1) / 2]} castShadow receiveShadow>
        <boxGeometry args={[7.4, 0.24, DECK_Z1 - Z1]} />
        <meshLambertMaterial map={maps.deck} />
      </mesh>
      {[-2.6, 0.9, 4.4].map((x) => (
        <mesh key={x} position={[x, (DECK_Y - 0.24) / 2, DECK_Z1 - 0.2]}>
          <boxGeometry args={[0.18, DECK_Y - 0.24, 0.18]} />
          <meshLambertMaterial map={tex.siding} />
        </mesh>
      ))}
      <Rail a={[-1.35, DECK_Z1 - 0.06]} b={[4.54, DECK_Z1 - 0.06]} base={DECK_Y} height={0.75} />
      <Rail a={[4.54, Z1 + 0.05]} b={[4.54, DECK_Z1 - 0.06]} base={DECK_Y} height={0.75} />

      {/* Escalones hacia el sendero, con faroles a los lados */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[-2.08, DECK_Y - 0.19 - i * 0.16, DECK_Z1 + 0.2 + i * 0.4]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.14, 0.42]} />
          <meshLambertMaterial map={maps.step} />
        </mesh>
      ))}
      <LanternPost night={night} position={[-2.95, 0, DECK_Z1 + 0.35]} light />
      <LanternPost night={night} position={[-1.2, 0, DECK_Z1 + 0.35]} />

      <Chair position={[3.0, DECK_Y, 3.0]} rotation={[0, 0.25, 0]} />
      <Chair position={[4.0, DECK_Y, 3.25]} rotation={[0, -0.2, 0]} />

      {/* Apliques en los pilares */}
      {[A[0] + 0.12, B[0] - 0.12].map((x) => (
        <mesh key={x} position={[x, 1.25, Z1 + 0.24]}>
          <boxGeometry args={[0.14, 0.2, 0.12]} />
          <meshLambertMaterial color="#ffd27a" emissive={WARM} emissiveIntensity={0.5 + night * 3} />
        </mesh>
      ))}

      {/* Luz que sale por el ventanal: baña el deck y el pasto de enfrente */}
      <pointLight position={[0, 1.6, Z1 + 1.5]} color={WARM} intensity={3 + night * 26} distance={12} decay={2} />
      <pointLight position={[3.7, 1.5, 2.6]} color={WARM} intensity={1 + night * 10} distance={8} decay={2} />
    </group>
  )
}
