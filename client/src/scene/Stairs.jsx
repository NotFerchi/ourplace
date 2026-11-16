import { useMemo } from 'react'
import { LanternPost } from './parts'
import { getTextures, tiled } from './textures'
import { DOCK, PLATEAU, STAIRS, STAIRS_X1, stairY } from './world'

const { x0, z, width, steps, rise, run } = STAIRS
const LENGTH = steps * run
const DROP = steps * rise
const SLOPE = Math.atan2(DROP, LENGTH)
const OUTER = z + width / 2 // lado del lago
const POST_H = 0.95
// Un poste con farol cada dos escalones, del descanso hasta el muelle
const POSTS = Array.from({ length: steps / 2 + 1 }, (_, i) => x0 + i * 2 * run)

/** Tramo de cuerda entre dos postes, con una ligera caída al centro. */
function Rope({ ax, bx, y }) {
  const mid = (ax + bx) / 2
  const dy = stairY(bx) - stairY(ax)
  const half = Math.hypot((bx - ax) / 2, dy / 2 + 0.07)
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[mid + (s * (bx - ax)) / 4, (stairY(ax) + stairY(bx)) / 2 + y - 0.035 + (s * dy) / 4, OUTER]}
          rotation={[0, 0, Math.atan2(dy / 2 + s * 0.07, (bx - ax) / 2)]}
        >
          <boxGeometry args={[half, 0.035, 0.035]} />
          <meshLambertMaterial color="#b89a6a" />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Escalera de madera apoyada sobre el talud de roca (los bloques que la
 * sostienen se generan en Forest.jsx), con barandal de cuerda, un farol en
 * cada poste y un muelle al pie.
 */
export default function Stairs({ night }) {
  const tex = getTextures()
  const maps = useMemo(() => ({ step: tiled(tex.deck, 0.4, 1), dock: tiled(tex.deck, 1.5, 1.2), beam: tiled(tex.siding, 3, 0.3) }), [tex])

  return (
    <group>
      {/* Descanso que une la meseta con la escalera */}
      <mesh position={[x0 - 0.5, -0.05, z]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.12, width + 0.1]} />
        <meshLambertMaterial map={maps.dock} />
      </mesh>

      {/* Escalones */}
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[x0 + (i + 0.5) * run, -(i + 1) * rise + 0.02, z]} castShadow receiveShadow>
          <boxGeometry args={[run + 0.05, 0.1, width]} />
          <meshLambertMaterial map={maps.step} />
        </mesh>
      ))}
      {/* Largueros que asientan los escalones sobre la roca */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[x0 + LENGTH / 2, -DROP / 2 - 0.16, z + s * (width / 2 - 0.06)]} rotation={[0, 0, -SLOPE]} castShadow>
          <boxGeometry args={[Math.hypot(LENGTH, DROP) + 0.3, 0.22, 0.1]} />
          <meshLambertMaterial map={maps.beam} />
        </mesh>
      ))}

      {/* Postes con farol y barandal de cuerda doble */}
      {POSTS.map((x, i) => (
        <group key={x}>
          <LanternPost night={night} position={[x, stairY(x) - 0.08, OUTER]} height={POST_H} light={i % 2 === 0} range={5.5} />
          {i < POSTS.length - 1 && (
            <>
              <Rope ax={x} bx={POSTS[i + 1]} y={POST_H - 0.12} />
              <Rope ax={x} bx={POSTS[i + 1]} y={POST_H * 0.5} />
            </>
          )}
        </group>
      ))}
      <LanternPost night={night} position={[x0 - 0.95, 0, PLATEAU.z1 - 0.2]} light />
      <LanternPost night={night} position={[x0 - 0.95, 0, PLATEAU.z1 - 1.4]} />

      {/* Muelle */}
      <mesh position={[DOCK.x, DOCK.y, DOCK.z]} castShadow receiveShadow>
        <boxGeometry args={[DOCK.w, 0.2, DOCK.d]} />
        <meshLambertMaterial map={maps.dock} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 0, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[DOCK.x + sx * (DOCK.w / 2 - 0.08), DOCK.y - 0.3, DOCK.z + sz * (DOCK.d / 2 - 0.1)]}>
            <boxGeometry args={[0.2, 1.0, 0.2]} />
            <meshLambertMaterial map={tex.siding} />
          </mesh>
        )),
      )}
      <LanternPost night={night} position={[DOCK.x - DOCK.w / 2 + 0.1, DOCK.y + 0.1, DOCK.z + DOCK.d / 2 - 0.12]} height={0.7} light range={4.2} />
      <LanternPost night={night} position={[DOCK.x + DOCK.w / 2 - 0.1, DOCK.y + 0.1, DOCK.z + DOCK.d / 2 - 0.12]} height={0.7} />
      <LanternPost night={night} position={[STAIRS_X1 + 0.35, DOCK.y + 0.1, z - width / 2 + 0.1]} height={0.7} />
    </group>
  )
}
