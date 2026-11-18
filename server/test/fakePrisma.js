import { randomUUID } from 'node:crypto'

// Prisma en memoria con solo lo que usan las rutas de tareas e integraciones.
// Respeta los índices únicos del schema (lanza P2002 como Postgres) para que las
// pruebas de idempotencia signifiquen algo.

const COMPOUND = {
  userId_provider: ['userId', 'provider'],
  userId_source_externalId: ['userId', 'source', 'externalId'],
}

function expand(where = {}) {
  const out = {}
  for (const [k, v] of Object.entries(where)) {
    if (COMPOUND[k]) Object.assign(out, v)
    else out[k] = v
  }
  return out
}

function matches(row, where) {
  return Object.entries(expand(where)).every(([k, cond]) => {
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond) return cond.in.includes(row[k])
      if ('not' in cond) return row[k] !== cond.not
    }
    return row[k] === cond
  })
}

const pick = (row, select) =>
  select ? Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]])) : { ...row }

function model(defaults, uniques) {
  const rows = []
  const violates = (candidate, self) =>
    uniques.some((cols) =>
      rows.some((r) => r !== self && cols.every((c) => candidate[c] != null && r[c] === candidate[c])),
    )
  const create = (data) => {
    const now = new Date()
    const row = { id: randomUUID(), ...defaults(), createdAt: now, updatedAt: now, ...data }
    if (violates(row)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    rows.push(row)
    return row
  }
  const apply = (row, data) => {
    const next = { ...row }
    for (const [k, v] of Object.entries(data)) next[k] = v && typeof v === 'object' && 'push' in v ? [...row[k], v.push] : v
    if (violates(next, row)) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    Object.assign(row, next, { updatedAt: new Date() })
    return row
  }
  return {
    rows,
    async findMany({ where, select } = {}) {
      return rows.filter((r) => matches(r, where)).map((r) => pick(r, select))
    },
    async findUnique({ where, select }) {
      const row = rows.find((r) => matches(r, where))
      return row ? pick(row, select) : null
    },
    async findFirst(args) {
      return this.findUnique(args)
    },
    async create({ data, select }) {
      return pick(create(data), select)
    },
    async upsert({ where, create: c, update, select }) {
      const row = rows.find((r) => matches(r, where))
      return pick(row ? apply(row, update) : create(c), select)
    },
    async updateMany({ where, data }) {
      const hit = rows.filter((r) => matches(r, where))
      hit.forEach((r) => apply(r, data))
      return { count: hit.length }
    },
    async deleteMany({ where }) {
      let count = 0
      for (let i = rows.length - 1; i >= 0; i--) {
        if (matches(rows[i], where)) {
          rows.splice(i, 1)
          count++
        }
      }
      return { count }
    },
  }
}

export function createFakePrisma() {
  return {
    task: model(
      () => ({ notes: null, done: false, completedAt: null, notifiedAt: null, source: 'MANUAL', externalId: null, externalUrl: null }),
      [['userId', 'source', 'externalId']],
    ),
    integration: model(
      () => ({ refreshTokenEnc: null, expiresAt: null, config: null, lastSyncAt: null, lastError: null }),
      [['userId', 'provider']],
    ),
  }
}
