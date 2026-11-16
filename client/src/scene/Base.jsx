import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide, PlaneGeometry, Vector3 } from 'three'
import { getTextures, tiled } from './textures'
import { BASE_Y, FIRE, LAND, PATH, PLATEAU, WATER_Y, smoothstep } from './world'

const W = LAND.x1 - LAND.x0
const D = PLATEAU.z1 - LAND.z0
const CX = (LAND.x0 + LAND.x1) / 2
const CZ = (LAND.z0 + PLATEAU.z1) / 2
const LAKE_D = 160

/** Sendero: una cinta de adoquín que sigue una curva suave. */
function usePath() {
  return useMemo(() => {
    const curve = new CatmullRomCurve3(PATH.map(([x, z]) => new Vector3(x, 0, z)))
    const pts = curve.getSpacedPoints(60)
    const half = 0.55
    const positions = []
    const uvs = []
    const normals = []
    const index = []
    let length = 0
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      const tl = Math.hypot(b.x - a.x, b.z - a.z) || 1
      const nx = (b.z - a.z) / tl
      const nz = -(b.x - a.x) / tl
      if (i > 0) length += p.distanceTo(pts[i - 1])
      for (const side of [-1, 1]) {
        positions.push(p.x + nx * half * side, 0.025, p.z + nz * half * side)
        normals.push(0, 1, 0)
        uvs.push(side === 1 ? 1 : 0, length / 1.1)
      }
      if (i < pts.length - 1) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3)
    })
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
    geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
    geo.setIndex(index)
    return geo
  }, [])
}

/**
 * Pasto del campamento, con tinte por vértice: tierra en el claro y más oscuro
 * bajo el bosque. Es una losa detallada solo donde se ve de cerca.
 */
function useCampTop() {
  return useMemo(() => {
    const x0 = -26
    const x1 = 26
    const z0 = -26
    const geo = new PlaneGeometry(x1 - x0, PLATEAU.z1 - z0, 104, 62)
    geo.rotateX(-Math.PI / 2)
    geo.translate((x0 + x1) / 2, 0, (z0 + PLATEAU.z1) / 2)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const wobble = Math.sin(x * 1.7 + z * 0.9) * 0.25 + Math.sin(x * 0.6 - z * 1.4) * 0.2
      const clearing = 1 - smoothstep(0.55, 1.15, Math.hypot((x - FIRE[0] + 0.6) / 3.9, (z - FIRE[2] + 0.2) / 2.9) + wobble * 0.3)
      // Sombra del bosque alrededor del campamento
      const shade = Math.max(smoothstep(-4.2, -6, z), smoothstep(6, 7.6, x), smoothstep(-9.6, -11, x)) * 0.42
      const k = 1 - shade
      colors[i * 3] = k * (1 + clearing * 0.75)
      colors[i * 3 + 1] = k * (1 + clearing * 0.12)
      colors[i * 3 + 2] = k * (1 - clearing * 0.2)
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    return geo
  }, [])
}

/**
 * Terreno: meseta de bosque, pared del acantilado, lago y sendero.
 * Todo se extiende hasta perderse en la niebla, sin bordes a la vista.
 */
export default function Base({ night }) {
  const tex = getTextures()
  const maps = useMemo(
    () => ({
      grass: tiled(tex.grass, 26, 15.25),
      far: tiled(tex.grass, W / 2, D / 2),
      cliff: tiled(tex.rock, W / 3, 1.4),
      water: tiled(tex.water, W / 3, LAKE_D / 3),
      cobble: tex.cobble,
    }),
    [tex],
  )
  const path = usePath()
  const camp = useCampTop()

  useFrame((_, delta) => {
    maps.water.offset.x += delta * 0.012
    maps.water.offset.y += delta * 0.02
  })

  return (
    <group>
      {/* Suelo del bosque lejano (oscuro) y losa detallada del campamento encima */}
      <mesh position={[CX, -0.01, CZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshLambertMaterial map={maps.far} color="#8f8f8f" />
      </mesh>
      <mesh geometry={camp} position={[0, 0.005, 0]} receiveShadow>
        <meshLambertMaterial map={maps.grass} vertexColors />
      </mesh>

      {/* Pared del acantilado, detrás de los bloques de roca */}
      <mesh position={[CX, (WATER_Y + BASE_Y) / 2 + 2, PLATEAU.z1 + 0.02]}>
        <planeGeometry args={[W, -BASE_Y]} />
        <meshLambertMaterial map={maps.cliff} color="#8a8a8a" />
      </mesh>

      {/* Lago: Phong para que las luces cálidas dejen destellos en el agua */}
      <mesh position={[CX, WATER_Y, PLATEAU.z1 + LAKE_D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, LAKE_D]} />
        <meshPhongMaterial
          map={maps.water}
          color="#8fa0bc"
          emissive="#12314a"
          emissiveIntensity={0.3 - night * 0.14}
          specular="#6b4424"
          shininess={90}
        />
      </mesh>

      <mesh geometry={path} receiveShadow>
        <meshLambertMaterial map={maps.cobble} side={DoubleSide} />
      </mesh>
    </group>
  )
}
