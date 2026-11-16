import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, Color, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, Object3D } from 'three'
import { getTextures, tiled } from './textures'
import { DOCK, PATH, PLATEAU, STAIRS, STAIRS_X1, WATERFALL_X, WATER_Y, canPlantTree, seeded, stairY } from './world'

const TIERS = 6
const CLIFF_Z = PLATEAU.z1

// Verdes oscuros de bosque: cada pino toma uno y lo aclara u oscurece un poco
const TREE_TONES = ['#ffffff', '#d9f0d0', '#bfe3c8', '#e8e6b8', '#a9d6b4', '#cfe0a6', '#f1ffe6']

function plantTrees() {
  const rand = seeded(2026)
  const trees = []
  const add = (x, z, s, slim = 1) =>
    trees.push({ x, z, s, slim, r: rand() * 6.28, tone: TREE_TONES[Math.floor(rand() * TREE_TONES.length)], tint: 0.7 + rand() * 0.5 })

  // Pinos grandes plantados a mano junto a la cabaña, para equilibrar el bosque
  ;[[-11.6, -2.4, 2.0], [-11.0, -6.2, 2.25], [-12.6, 0.9, 1.75], [-10.9, 2.3, 1.2], [-13.4, -4.4, 2.1], [-9.6, -7.6, 1.9]].forEach(([x, z, s]) => add(x, z, s, 0.9))

  // El resto: siembra aleatoria que se va espaciando hacia la niebla
  for (let i = 0; i < 9000 && trees.length < 760; i++) {
    const x = -44 + rand() * 88
    const z = -52 + rand() * 56
    if (!canPlantTree(x, z)) continue
    const dist = Math.hypot(x, z + 2)
    const gap = 0.85 + Math.min(1.1, dist / 40)
    if (trees.some((t) => Math.abs(t.x - x) < gap && Math.abs(t.z - z) < gap && Math.hypot(t.x - x, t.z - z) < gap)) continue
    // Alturas muy variadas; más altos lejos, para cerrar el horizonte
    const tall = rand() < 0.18 ? 0.5 : 0
    const s = 0.75 + rand() * 0.75 + tall + Math.min(0.7, dist / 45)
    // Los del filo frontal izquierdo son bajos para no tapar la cabaña
    const frontLeft = x < -10 && z > 0.5 ? 0.7 : 1
    add(x, z, s * frontLeft, 0.82 + rand() * 0.36)
  }
  return trees
}

/** Bloques de roca verticales, en tres escalones que bajan hacia el agua. */
function placeColumns() {
  const rand = seeded(41)
  const cols = []
  const add = (x, z, top, r, depth = 1) => {
    const bottom = WATER_Y - 0.6
    if (top - bottom < 0.4) return
    cols.push({ x, z, top, bottom, r, rd: r * depth, ry: rand() * 6.28, tone: 0.72 + rand() * 0.4 })
  }

  for (let x = -40; x < 40; x += 0.95 + rand() * 0.5) {
    const nearFall = Math.abs(x - WATERFALL_X) < 2.0 // la cascada tiene sus propias repisas, más abajo
    const underStairs = x > STAIRS.x0 - 0.8 && x < STAIRS_X1 + 0.9
    const atDock = x > DOCK.x - DOCK.w / 2 - 0.6 && x < DOCK.x + DOCK.w / 2 + 0.6
    const j = () => (rand() - 0.5) * 0.3

    // Escalón alto, pegado a la pared: llega casi al pasto
    if (!nearFall && !underStairs) add(x + j(), CLIFF_Z + 0.35 + rand() * 0.25, -0.08 - rand() * 0.55, 0.62 + rand() * 0.3)
    // Escalón medio
    if (!nearFall && !underStairs && rand() > 0.12) add(x + j() + 0.4, CLIFF_Z + 1.05 + rand() * 0.3, -1.5 - rand() * 0.9, 0.6 + rand() * 0.3)
    // Escalón bajo, ya en el agua
    if (!nearFall && !atDock && rand() > 0.35) {
      const z = CLIFF_Z + 1.8 + rand() * 0.45
      const top = WATER_Y + 0.45 + rand() * 0.75
      if (!underStairs || top < stairY(x) - 1) add(x + j(), z, top, 0.5 + rand() * 0.3)
    }
  }

  // Talud bajo la escalera: bloques que siguen la pendiente y la sostienen
  for (let x = STAIRS.x0 - 0.5; x < STAIRS_X1 + 0.5; x += 0.62) {
    add(x, STAIRS.z + 0.02, stairY(x + 0.2) - 0.17, 0.5, 1.45)
    add(x + 0.25, STAIRS.z - 0.55, Math.min(-0.1, stairY(x) + 0.55 + rand() * 0.3), 0.5, 1)
    if (stairY(x) < -1.2 && x < DOCK.x - DOCK.w / 2 - 0.3) add(x + 0.1, STAIRS.z + 0.95, stairY(x) - 0.9 - rand() * 0.5, 0.48)
  }

  // Repisas de la cascada: una alta a cada lado y la del salto intermedio
  add(WATERFALL_X - 1.3, CLIFF_Z + 0.5, -0.15, 0.75)
  add(WATERFALL_X + 1.3, CLIFF_Z + 0.45, -0.25, 0.72)
  add(WATERFALL_X - 1.45, CLIFF_Z + 1.35, -1.55, 0.7)
  add(WATERFALL_X + 1.5, CLIFF_Z + 1.3, -1.8, 0.7)
  add(WATERFALL_X, CLIFF_Z + 0.95, -2.32, 0.95, 0.8)
  add(WATERFALL_X, CLIFF_Z + 0.2, -0.75, 0.9, 0.5)
  return cols
}

function placeBoulders() {
  const rand = seeded(77)
  const rocks = []
  const add = (x, y, z, s, sy = 1) => rocks.push({ x, y, z, s, sy: sy * (0.85 + rand() * 0.4), ry: rand() * 6.28, tone: 0.78 + rand() * 0.35 })

  // Peñascos y piedras dentro del lago
  ;[[-6.9, 8.4, 1.25], [-5.4, 9.4, 0.6], [-3.4, 8.0, 0.55], [-1.6, 7.3, 0.7], [0.6, 7.6, 0.5], [3.2, 8.2, 0.45], [5.2, 9.0, 0.55], [-9.4, 7.6, 0.9], [-13, 8.8, 1.1], [12, 8.2, 0.9], [15.5, 9.6, 1.2], [-17, 7.2, 0.7]].forEach(
    ([x, z, s]) => add(x, WATER_Y - s * 0.12, z, s, 0.75),
  )
  for (let x = -34; x < 34; x += 0.9 + rand() * 0.9) {
    if (Math.abs(x - WATERFALL_X) < 1.4 || (x > DOCK.x - 1.4 && x < DOCK.x + 1.4)) continue
    add(x, WATER_Y, CLIFF_Z + 2.4 + rand() * 0.7, 0.22 + rand() * 0.3, 0.8)
  }
  // Rocas a los lados de la espuma de la cascada
  add(WATERFALL_X - 1.5, WATER_Y, CLIFF_Z + 2.5, 0.6, 0.8)
  add(WATERFALL_X + 1.6, WATER_Y, CLIFF_Z + 2.4, 0.5, 0.8)
  // Unas pocas en la meseta, fuera del claro
  ;[[-7.9, 0.9, 0.5], [0.3, -4.7, 0.42], [5.9, -3.6, 0.4], [6.6, 3.3, 0.45], [-2.0, 3.9, 0.3], [-11.8, 3.2, 0.6], [10.5, 2.4, 0.55], [9.2, -2.2, 0.4]].forEach(
    ([x, z, s]) => add(x, s * 0.25, z, s, 0.8),
  )
  return rocks
}

/** Helechos y arbustos bajos: rompen las líneas rectas del filo, el sendero y las rocas. */
function placeUndergrowth(columns) {
  const rand = seeded(303)
  const ferns = []
  const bushes = []
  const fern = (x, y, z, s) => ferns.push({ x, y, z, s, r: rand() * 6.28, tint: 1.25 + rand() * 0.9, warm: rand() })
  const bush = (x, y, z, s) => bushes.push({ x, y, z, s, sy: 0.6 + rand() * 0.3, r: rand() * 6.28, tint: 0.75 + rand() * 0.5 })
  const onLanding = (x) => x > 2.3 && x < 3.7

  // Filo del acantilado
  for (let x = -30; x < 30; x += 0.5 + rand() * 0.6) {
    if (onLanding(x)) continue
    if (rand() < 0.62) fern(x, 0, CLIFF_Z - 0.12 - rand() * 0.45, 0.32 + rand() * 0.3)
    else bush(x, 0.08, CLIFF_Z - 0.2 - rand() * 0.4, 0.24 + rand() * 0.24)
  }
  // Encima de los bloques de roca
  columns.forEach((c) => {
    if (c.top < WATER_Y + 0.6 || Math.abs(c.x - WATERFALL_X) < 1) return
    if (c.x > STAIRS.x0 - 1 && c.x < STAIRS_X1 + 1 && Math.abs(c.z - STAIRS.z) < 0.5) return
    if (rand() < 0.55) fern(c.x + (rand() - 0.5) * 0.5, c.top, c.z + (rand() - 0.5) * 0.4, 0.3 + rand() * 0.28)
    if (rand() < 0.2) bush(c.x + (rand() - 0.5) * 0.4, c.top + 0.05, c.z, 0.22 + rand() * 0.16)
  })
  // A los lados del sendero de piedra
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i]
    const [bx, bz] = PATH[i + 1]
    const len = Math.hypot(bx - ax, bz - az)
    for (let t = 0.15; t < 1; t += 0.42 / len) {
      const side = rand() > 0.5 ? 1 : -1
      const off = 0.85 + rand() * 0.35
      const x = ax + (bx - ax) * t + ((bz - az) / len) * off * side
      const z = az + (bz - az) * t - ((bx - ax) / len) * off * side
      if (z > CLIFF_Z - 0.2 || onLanding(x)) continue
      if (rand() < 0.5) fern(x, 0, z, 0.26 + rand() * 0.22)
      else if (rand() < 0.5) bush(x, 0.06, z, 0.2 + rand() * 0.16)
    }
  }
  // Sotobosque al pie de los pinos, alrededor del claro
  for (let i = 0; i < 260; i++) {
    const x = -22 + rand() * 44
    const z = -16 + rand() * 19
    if (!canPlantTree(x, z)) continue
    if (rand() < 0.6) fern(x, 0, z, 0.3 + rand() * 0.35)
    else bush(x, 0.08, z, 0.25 + rand() * 0.3)
  }
  return { ferns, bushes }
}

/** Prisma de roca: caras lisas, con musgo pintado por vértice en la parte de arriba. */
function useColumnGeometry() {
  return useMemo(() => {
    const geo = new CylinderGeometry(0.92, 1.06, 1, 7, 3)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      // Un poco de irregularidad en los anillos intermedios
      if (Math.abs(y) < 0.4) {
        const k = 1 + Math.sin(pos.getX(i) * 7 + y * 9) * 0.07
        pos.setX(i, pos.getX(i) * k)
        pos.setZ(i, pos.getZ(i) * k)
      }
      const moss = y > 0.49 ? 1 : y > 0.1 ? 0.35 : 0
      colors[i * 3] = 1 - moss * 0.6
      colors[i * 3 + 1] = 1 - moss * 0.05
      colors[i * 3 + 2] = 1 - moss * 0.68
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])
}

/** Roca redonda y lisa con bultos, y musgo arriba. */
function useBoulderGeometry() {
  return useMemo(() => {
    const geo = new IcosahedronGeometry(1, 2)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const bump = 1 + Math.sin(x * 3.1 + 1.3) * Math.sin(y * 2.7 + 0.4) * 0.16 + Math.sin(z * 4.3 + x * 1.9) * 0.1
      pos.setXYZ(i, x * bump, y * bump, z * bump)
      const moss = Math.max(0, Math.min(1, (y - 0.25) * 2 + Math.sin(x * 5 + z * 4) * 0.25))
      colors[i * 3] = 1 - moss * 0.55
      colors[i * 3 + 1] = 1 - moss * 0.05
      colors[i * 3 + 2] = 1 - moss * 0.62
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    return geo
  }, [])
}

/** Helecho: una falda cónica invertida, con el borde dentado hacia arriba. */
function useFernGeometry() {
  return useMemo(() => {
    const geo = new ConeGeometry(1, 0.62, 9, 1, true)
    geo.rotateX(Math.PI)
    geo.translate(0, 0.31, 0)
    return geo
  }, [])
}

/**
 * Bosque, rocas y sotobosque con InstancedMesh: cientos de piezas en seis
 * llamadas de dibujo. Cada pino son seis "faldas" con follaje recortado por alfa.
 */
export default function Forest() {
  const trunks = useRef()
  const skirts = useRef()
  const pillars = useRef()
  const stones = useRef()
  const fernsRef = useRef()
  const bushesRef = useRef()

  const trees = useMemo(plantTrees, [])
  const columns = useMemo(placeColumns, [])
  const boulders = useMemo(placeBoulders, [])
  const { ferns, bushes } = useMemo(() => placeUndergrowth(columns), [columns])

  const columnGeometry = useColumnGeometry()
  const boulderGeometry = useBoulderGeometry()
  const fernGeometry = useFernGeometry()
  const tex = getTextures()
  const maps = useMemo(
    () => ({ needles: tiled(tex.needles, 2, 1), fern: tiled(tex.needles, 1, 1), rock: tiled(tex.rock, 2, 1), column: tiled(tex.rock, 2, 1.5), bark: tiled(tex.bark, 1, 2) }),
    [tex],
  )

  useLayoutEffect(() => {
    const d = new Object3D()
    const c = new Color()
    const flush = (ref) => {
      ref.current.instanceMatrix.needsUpdate = true
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    }

    trees.forEach((t, i) => {
      d.rotation.set(0, t.r, 0)
      d.position.set(t.x, 0.55 * t.s, t.z)
      d.scale.set(t.s, t.s, t.s)
      d.updateMatrix()
      trunks.current.setMatrixAt(i, d.matrix)

      for (let k = 0; k < TIERS; k++) {
        const f = k / (TIERS - 1)
        const width = (1.05 - f * 0.78) * t.s * t.slim
        d.rotation.set(0, t.r + k * 1.1, 0)
        d.position.set(t.x, (1.15 + k * 0.58) * t.s, t.z)
        d.scale.set(width, t.s * (1 - f * 0.12), width)
        d.updateMatrix()
        skirts.current.setMatrixAt(i * TIERS + k, d.matrix)
        // Capas bajas más oscuras: simulan la sombra de las de arriba
        skirts.current.setColorAt(i * TIERS + k, c.set(t.tone).multiplyScalar(t.tint * (0.6 + f * 0.5)))
      }
    })
    flush(trunks)
    flush(skirts)

    columns.forEach((col, i) => {
      const h = col.top - col.bottom
      d.rotation.set(0, col.ry, 0)
      d.position.set(col.x, col.bottom + h / 2, col.z)
      d.scale.set(col.r, h, col.rd)
      d.updateMatrix()
      pillars.current.setMatrixAt(i, d.matrix)
      pillars.current.setColorAt(i, c.setScalar(col.tone))
    })
    flush(pillars)

    boulders.forEach((r, i) => {
      d.rotation.set(0, r.ry, 0)
      d.position.set(r.x, r.y, r.z)
      d.scale.set(r.s, r.s * r.sy, r.s)
      d.updateMatrix()
      stones.current.setMatrixAt(i, d.matrix)
      stones.current.setColorAt(i, c.setScalar(r.tone))
    })
    flush(stones)

    ferns.forEach((f, i) => {
      d.rotation.set(0, f.r, 0)
      d.position.set(f.x, f.y, f.z)
      d.scale.set(f.s, f.s, f.s)
      d.updateMatrix()
      fernsRef.current.setMatrixAt(i, d.matrix)
      fernsRef.current.setColorAt(i, c.setRGB(f.tint * (0.9 + f.warm * 0.35), f.tint * 1.05, f.tint * 0.7))
    })
    flush(fernsRef)

    bushes.forEach((b, i) => {
      d.rotation.set(0, b.r, 0)
      d.position.set(b.x, b.y + b.s * b.sy * 0.45, b.z)
      d.scale.set(b.s, b.s * b.sy, b.s)
      d.updateMatrix()
      bushesRef.current.setMatrixAt(i, d.matrix)
      bushesRef.current.setColorAt(i, c.setScalar(b.tint))
    })
    flush(bushesRef)
  }, [trees, columns, boulders, ferns, bushes])

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} frustumCulled={false} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 1.1, 7]} />
        <meshLambertMaterial map={maps.bark} />
      </instancedMesh>
      <instancedMesh ref={skirts} args={[undefined, undefined, trees.length * TIERS]} frustumCulled={false} castShadow>
        <coneGeometry args={[1, 1.5, 10, 1, true]} />
        <meshLambertMaterial map={maps.needles} alphaTest={0.5} side={DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={pillars} args={[columnGeometry, undefined, columns.length]} frustumCulled={false} castShadow receiveShadow>
        <meshLambertMaterial map={maps.column} vertexColors />
      </instancedMesh>
      <instancedMesh ref={stones} args={[boulderGeometry, undefined, boulders.length]} frustumCulled={false} castShadow receiveShadow>
        <meshLambertMaterial map={maps.rock} vertexColors />
      </instancedMesh>
      <instancedMesh ref={fernsRef} args={[fernGeometry, undefined, ferns.length]} frustumCulled={false}>
        <meshLambertMaterial map={maps.fern} alphaTest={0.5} side={DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={bushesRef} args={[undefined, undefined, bushes.length]} frustumCulled={false} castShadow>
        <sphereGeometry args={[1, 9, 6]} />
        <meshLambertMaterial map={tex.grass} />
      </instancedMesh>
    </group>
  )
}
