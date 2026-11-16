import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

/**
 * Texturas "pintadas a mano" de 256×256 px generadas en código.
 * Cada una se calcula píxel por píxel con ruido y se reduce a una paleta corta
 * (posterizado), que es lo que les da el aspecto de bitmap de la era PS2.
 * De cerca se ven pixeladas (NearestFilter); de lejos usan mipmaps para no parpadear.
 */
const S = 256

function hash(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const wrap = (a, p) => ((a % p) + p) % p

/** Ruido de valor que se repite sin costuras cada (px, py) celdas. */
function vnoise(x, y, px, py, seed) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const a = hash(wrap(xi, px), wrap(yi, py), seed)
  const b = hash(wrap(xi + 1, px), wrap(yi, py), seed)
  const c = hash(wrap(xi, px), wrap(yi + 1, py), seed)
  const d = hash(wrap(xi + 1, px), wrap(yi + 1, py), seed)
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(u, v, freq, seed, octaves = 4) {
  let sum = 0
  let amp = 0.5
  let f = freq
  let total = 0
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(u * f, v * f, f, f, seed + o * 17)
    total += amp
    amp *= 0.5
    f *= 2
  }
  return sum / total
}

/** Piedras irregulares (celdas de Worley). Devuelve borde, tono y relieve de cada piedra. */
function cells(u, v, nx, ny, seed) {
  const x = u * nx
  const y = v * ny
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  let f1 = 9
  let f2 = 9
  let id = 0
  let ox = 0
  let oy = 0
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i
      const cy = yi + j
      const wx = wrap(cx, nx)
      const wy = wrap(cy, ny)
      const px = cx + 0.15 + hash(wx, wy, seed) * 0.7
      const py = cy + 0.15 + hash(wx, wy, seed + 1) * 0.7
      const d = Math.hypot(x - px, y - py)
      if (d < f1) {
        f2 = f1
        f1 = d
        id = hash(wx, wy, seed + 2)
        ox = x - px
        oy = y - py
      } else if (d < f2) {
        f2 = d
      }
    }
  }
  return { edge: f2 - f1, id, light: -(ox + oy) * 0.5 }
}

const parse = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
const palette = (...hexes) => hexes.map(parse)
/** Elige un color de la paleta según t (0–1): pocos tonos = look pintado. */
const ramp = (pal, t) => pal[Math.max(0, Math.min(pal.length - 1, Math.floor(t * pal.length)))]

function paint(fn) {
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(S, S)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const c = fn(x / S, y / S, x, y)
      const k = (y * S + x) * 4
      img.data[k] = c[0]
      img.data[k + 1] = c[1]
      img.data[k + 2] = c[2]
      img.data[k + 3] = c.length > 3 ? c[3] : 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new CanvasTexture(canvas)
  tex.magFilter = NearestFilter
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 4
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.colorSpace = SRGBColorSpace
  return tex
}

// ── Paletas ────────────────────────────────────────────────────────────────
const P = {
  grass: palette('#263f1d', '#2f4c22', '#3a5a27', '#47692c', '#567a33', '#688b3c'),
  dirt: palette('#241810', '#2f2016', '#3d2a1c', '#4c3624', '#5d442e', '#70553b'),
  rock: palette('#33373a', '#42474b', '#53585d', '#666b70', '#7b8085', '#94989b'),
  moss: palette('#24401f', '#2f5226', '#3d662d', '#4f7b35'),
  cobble: palette('#5d564b', '#70685b', '#857c6c', '#998f7e', '#aea593'),
  wall: palette('#4a4c50', '#5c5f63', '#707377', '#85888b', '#9c9ea0'),
  deck: palette('#4a2f1b', '#5d3c22', '#724a2a', '#875933', '#9c6a3e', '#b07d4c'),
  siding: palette('#1c1410', '#261b15', '#31231b', '#3d2c22', '#4a362a'),
  roof: palette('#22252b', '#2b2f36', '#353a42', '#41464f', '#4f555f'),
  bark: palette('#2a1c13', '#38261a', '#473122', '#573d2b'),
  needles: palette('#143422', '#1a432b', '#215434', '#2b663e', '#387948', '#488c54'),
  water: palette('#05121c', '#081b29', '#0c2738', '#12364b', '#1c4a62', '#2f6a84'),
  foam: palette('#35749c', '#4f93b8', '#7fb9d6', '#bfe2f0', '#ffffff'),
}

const MORTAR = [34, 30, 27]

const painters = {
  grass: (u, v, x, y) => {
    const t = fbm(u, v, 6, 1) * 0.72 + hash(x, y, 3) * 0.28
    // Briznas: trazos verticales cortos más claros
    const blade = vnoise(u * 96, v * 24, 96, 24, 5) > 0.74 ? 0.16 : 0
    return ramp(P.grass, t + blade - 0.08)
  },

  // Corte de tierra con estratos y piedras, para los lados de la base
  dirt: (u, v, x, y) => {
    const band = Math.sin(v * 30 + fbm(u, v, 4, 11) * 6) * 0.1
    const stone = cells(u, v, 9, 9, 13)
    if (stone.id > 0.72 && stone.edge > 0.12) return ramp(P.rock, 0.35 + stone.light * 0.5 + stone.id * 0.3)
    return ramp(P.dirt, fbm(u, v * 2.5, 6, 12) * 0.75 + band + hash(x, y, 14) * 0.18)
  },

  rock: (u, v, x, y) => {
    const g = fbm(u, v, 5, 21)
    const crack = Math.abs(fbm(u, v, 9, 22, 3) - 0.5) < 0.018
    if (crack) return P.rock[0]
    const moss = fbm(u, v, 4, 23) + hash(x, y, 24) * 0.12
    if (moss > 0.62) return ramp(P.moss, (moss - 0.62) * 4 + g * 0.3)
    return ramp(P.rock, g * 0.85 + hash(x, y, 25) * 0.2)
  },

  cobble: (u, v, x, y) => {
    const c = cells(u, v, 7, 7, 31)
    if (c.edge < 0.09) return MORTAR
    return ramp(P.cobble, c.id * 0.55 + c.light * 0.55 + 0.25 + hash(x, y, 32) * 0.12)
  },

  wall: (u, v, x, y) => {
    const c = cells(u, v, 5, 8, 41)
    if (c.edge < 0.07) return MORTAR
    return ramp(P.wall, c.id * 0.6 + c.light * 0.5 + 0.2 + hash(x, y, 42) * 0.12)
  },

  deck: (u, v, x, y) => planks(u, v, x, y, P.deck, 8, 51),
  siding: (u, v, x, y) => planks(u, v, x, y, P.siding, 10, 61),

  roof: (u, v, x, y) => {
    const seam = (u * 8) % 1
    if (seam < 0.05) return P.roof[4]
    if (seam < 0.1) return P.roof[0]
    return ramp(P.roof, vnoise(u * 40, v * 5, 40, 5, 71) * 0.6 + hash(x, y, 72) * 0.2 + 0.1)
  },

  bark: (u, v, x, y) => ramp(P.bark, vnoise(u * 36, v * 5, 36, 5, 81) * 0.8 + hash(x, y, 82) * 0.25),

  // Follaje: ramas pintadas + borde inferior dentado recortado por alfa
  needles: (u, v, x, y) => {
    const fromBottom = 1 - v
    const tooth = Math.abs(((u * 9 + vnoise(u * 9, 0, 9, 1, 91) * 0.6) % 1) - 0.5) * 2
    const cut = 0.1 + tooth * 0.34 + vnoise(u * 40, 0, 40, 1, 92) * 0.08
    const alpha = fromBottom < cut ? 0 : 255
    const strokes = vnoise(u * 44, v * 9, 44, 9, 93)
    const depth = fromBottom * 0.35 // más claro hacia la punta de cada capa
    const c = ramp(P.needles, strokes * 0.6 + depth + hash(x, y, 94) * 0.16)
    return [c[0], c[1], c[2], alpha]
  },

  water: (u, v, x, y) => {
    const swell = fbm(u + Math.sin(v * 12.566) * 0.03, v, 5, 101)
    const ripple = vnoise(u * 7, v * 40, 7, 40, 102) > 0.74 ? 0.3 : 0
    return ramp(P.water, swell * 0.62 + ripple + hash(x, y, 103) * 0.08)
  },

  // Espuma plana azul y blanca para la cascada
  foam: (u, v, x, y) => {
    const streak = vnoise(u * 22, v * 3, 22, 3, 111)
    const clump = vnoise(u * 6, v * 10, 6, 10, 112)
    return ramp(P.foam, streak * 0.6 + clump * 0.45 + hash(x, y, 113) * 0.08 - 0.05)
  },

  // Ventanal: un paño por mosaico, con marco oscuro e interior cálido
  window: (u, v, x, y) => {
    const fu = Math.min(u, 1 - u)
    const fv = Math.min(v, 1 - v)
    if (fu < 0.045 || fv < 0.04) return [18, 16, 15]
    // Siluetas simples del interior: sofá, mesa y lámpara
    const sofa = v > 0.7 && v < 0.86 && u > 0.16 && u < 0.72
    const back = v > 0.6 && v < 0.72 && u > 0.16 && u < 0.3
    const lampPole = Math.abs(u - 0.82) < 0.012 && v > 0.42 && v < 0.9
    if (sofa || back || lampPole) return [176, 96, 40]
    if (Math.hypot(u - 0.82, v - 0.36) < 0.085) return [255, 244, 214]
    if (v > 0.9) return [140, 74, 30]
    const glow = 1 - Math.hypot(u - 0.5, v - 0.4) * 1.05
    const t = Math.max(0, Math.min(1, glow * 0.85 + fbm(u, v, 3, 121, 2) * 0.2 + hash(x, y, 122) * 0.05))
    return [255, Math.round(146 + t * 78), Math.round(48 + t * 90)]
  },
}

function planks(u, v, x, y, pal, count, seed) {
  const board = Math.floor(u * count)
  const edge = (u * count) % 1
  if (edge < 0.05) return pal[0]
  const tone = hash(board, 0, seed) * 0.3
  // Juntas a lo largo, desfasadas por tablón
  const joint = (v * 2 + hash(board, 1, seed)) % 1
  if (joint < 0.012) return pal[0]
  const grain = vnoise(u * 70, v * 5, 70, 5, seed + 2)
  const knot = Math.hypot(((u * count) % 1) - 0.5, ((v * 3 + hash(board, 2, seed)) % 1) - 0.5)
  if (knot < 0.07 && hash(board, 3, seed) > 0.55) return pal[1]
  return ramp(pal, grain * 0.55 + tone + 0.18 + hash(x, y, seed + 4) * 0.1 + (edge < 0.12 ? 0.12 : 0))
}

let cache = null

/** Crea todas las texturas una sola vez. */
export function getTextures() {
  if (!cache) {
    cache = {}
    for (const [name, fn] of Object.entries(painters)) cache[name] = paint(fn)
  }
  return cache
}

/** Copia de una textura con su propio número de repeticiones. */
export function tiled(texture, x, y) {
  const t = texture.clone()
  t.repeat.set(x, y)
  t.needsUpdate = true
  return t
}
