import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, DoubleSide } from 'three'
import Particles from './Particles'
import { getTextures, tiled } from './textures'
import { PLATEAU, WATERFALL_X, WATER_Y } from './world'

// Perfil lateral de la caída: [altura, distancia al acantilado, ancho].
// Dos saltos con una repisa intermedia donde el agua se remansa.
const PROFILE = [
  [-0.62, 0.55, 0.7],
  [-0.78, 0.82, 0.8],
  [-2.14, 0.95, 0.95], // fin del primer salto
  [-2.17, 1.8, 1.45], // repisa
  [-2.4, 1.98, 1.3],
  [-3.9, 2.12, 1.35], // fin del segundo salto
  [WATER_Y + 0.03, 2.8, 2.0],
]
const POOL_Z = PLATEAU.z1 + 2.9

function FoamRings() {
  const rings = useRef([])
  useFrame(({ clock }) => {
    rings.current.forEach((mesh, i) => {
      if (!mesh) return
      const life = (clock.elapsedTime * 0.3 + i / 3) % 1
      mesh.scale.setScalar(0.7 + life * 2)
      mesh.material.opacity = (1 - life) * 0.3
    })
  })
  return (
    <group position={[WATERFALL_X, WATER_Y + 0.05, POOL_Z]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (rings.current[i] = el)}>
          <ringGeometry args={[0.7, 0.8, 14]} />
          <meshBasicMaterial color="#dff1f8" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Cascada en dos niveles, con espuma plana azul y blanca donde rompe el agua. */
export default function Waterfall({ night }) {
  const tex = getTextures()
  const map = useMemo(() => tiled(tex.foam, 1, 1), [tex])
  const foamMap = useMemo(() => tiled(tex.foam, 1.5, 1.5), [tex])

  const geometry = useMemo(() => {
    const positions = []
    const uvs = []
    const index = []
    let length = 0
    PROFILE.forEach(([y, out, width], i) => {
      if (i > 0) length += Math.hypot(y - PROFILE[i - 1][0], out - PROFILE[i - 1][1])
      for (const side of [-1, 1]) {
        positions.push(WATERFALL_X + (side * width) / 2, y, PLATEAU.z1 + out)
        uvs.push(side === 1 ? 1 : 0, length / 1.6)
      }
      if (i < PROFILE.length - 1) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    })
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
    geo.setIndex(index)
    geo.computeVertexNormals()
    return geo
  }, [])

  useFrame((_, delta) => {
    map.offset.y += delta * 0.9
    foamMap.offset.y -= delta * 0.12
  })

  const light = 0.34 - night * 0.14

  return (
    <group>
      {/* Boca oscura de donde brota el agua */}
      <mesh position={[WATERFALL_X, -0.5, PLATEAU.z1 + 0.45]}>
        <boxGeometry args={[0.85, 0.5, 0.4]} />
        <meshLambertMaterial color="#070b10" />
      </mesh>
      <mesh geometry={geometry}>
        <meshLambertMaterial map={map} side={DoubleSide} emissive="#6fb2d6" emissiveIntensity={light} />
      </mesh>
      {/* Espuma sobre el lago, al pie del segundo salto */}
      <mesh position={[WATERFALL_X, WATER_Y + 0.035, POOL_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 12]} />
        <meshLambertMaterial map={foamMap} emissive="#6fb2d6" emissiveIntensity={light} transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <FoamRings />
      <Particles
        count={26}
        position={[WATERFALL_X, WATER_Y + 0.5, POOL_Z - 0.3]}
        scale={[1.8, 1, 1.4]}
        size={3}
        speed={1.2}
        rise={0.5}
        color="#ffffff"
        opacity={0.45}
      />
      <Particles
        count={10}
        position={[WATERFALL_X, -1.9, PLATEAU.z1 + 1.4]}
        scale={[1.1, 0.6, 0.8]}
        size={2.4}
        speed={1.2}
        rise={0.5}
        color="#ffffff"
        opacity={0.35}
      />
    </group>
  )
}
