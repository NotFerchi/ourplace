/**
 * Plano de la escena: medidas y dónde va cada cosa.
 * Ejes: +x derecha, +z hacia el frente (el lago), +y arriba.
 *
 *            bosque que se pierde en la niebla
 *   ─────────────────────────────────────────────────
 *     pinos │ cabaña        bosque            │ pinos
 *    altos  │   + deck    claro, fogata       │
 *           │      sendero ~~~~~~~┐           │         meseta (y = 0)
 *   ════════╪═cascada══acantilado═╧escalera═══╪══════   borde (z = 4.5)
 *                    lago            muelle             agua (y = -4)
 *
 * La meseta, el acantilado y el lago siguen mucho más allá de lo que ve la
 * cámara; la niebla esconde dónde terminan.
 */
export const PLATEAU = { x0: -9, x1: 9, z0: -8, z1: 4.5 } // zona "jugable" del campamento
export const LAND = { x0: -130, x1: 130, z0: -130 } // terreno real, hasta la niebla
export const WATER_Y = -4
export const BASE_Y = -7

export const CABIN = { position: [-4.9, 0, -4.3], rotation: 0.17 }
export const FIRE = [3.2, 0, 0.3]
export const LOGS = [
  { position: [3.5, 0, -1.25], rotation: -0.2, couple: true },
  { position: [5.0, 0, 0.6], rotation: -1.35 },
]

// Sendero de adoquín: de los escalones del deck a la escalera del acantilado
export const PATH = [
  [-6.05, 1.45], [-5.7, 2.7], [-3.9, 3.3], [-1.4, 2.9], [0.8, 3.1], [2.3, 3.5], [2.95, 4.45],
]

// Escalera que baja apoyada en el talud, hacia la derecha, hasta el muelle
export const STAIRS = { x0: 3.4, z: 5.15, width: 1.1, steps: 14, rise: 0.27, run: 0.36 }
export const STAIRS_X1 = STAIRS.x0 + STAIRS.steps * STAIRS.run
export const stairY = (x) => -Math.max(0, Math.min(STAIRS.steps, (x - STAIRS.x0) / STAIRS.run)) * STAIRS.rise
export const DOCK = { x: 8.0, y: -STAIRS.steps * STAIRS.rise - 0.12, z: 6.95, w: 1.9, d: 2.9 }

export const WATERFALL_X = -5.2

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** PRNG con semilla: el bosque y las rocas salen igual en cada recarga. */
export function seeded(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * ¿Puede crecer un pino en (x, z)?
 * Todo es bosque salvo el campamento: la cabaña con su deck y el claro.
 */
export function canPlantTree(x, z) {
  if (z > 3.9) return false // el filo del acantilado queda libre
  const camp = x > -10.4 && x < 6.8 && z > -7.0
  if (!camp) return true
  if (x > -0.6 && z < -5.3) return true // fondo del claro
  if (x > 2.4 && z < -4.1) return true // fondo derecho, más profundo
  return false
}
