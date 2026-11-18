// Pruebas de la importación desde ClickUp con un ClickUp simulado y Prisma en memoria.
// Corre con:  npm test   (usa node:test y mock.module, sin base de datos ni red)
import assert from 'node:assert/strict'
import { after, before, describe, mock, test } from 'node:test'
import jwt from 'jsonwebtoken'
import { createFakePrisma } from './fakePrisma.js'

process.env.JWT_SECRET = 'secreto-de-pruebas-'.repeat(3)
process.env.TOKEN_ENC_KEY = 'a1'.repeat(32)

const db = createFakePrisma()
mock.module(new URL('../src/db.js', import.meta.url).href, { exports: { prisma: db } })
const { app } = await import('../src/app.js')

// --- ClickUp simulado -------------------------------------------------------
const TOKENS = { pk_ana: 101, pk_beto: 202 } // token → id de usuario en ClickUp
const remote = new Map() // tareas abiertas asignadas a Ana (id → tarea)
const closedRemote = new Map() // tareas que se cerraron (ya no salen en la lista)
const calls = []
let rateLimitOnce = true

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

function clickupTask(i) {
  return {
    id: `cu${i}`,
    name: `Tarea ${i}`,
    description: i === 0 ? 'Ver https://example.com/spec' : '',
    status: { status: 'to do', type: 'open' },
    due_date: String(Date.UTC(2026, 10, 20, 18, 0)),
    due_date_time: i % 2 === 0,
    url: `https://app.clickup.com/t/cu${i}`,
  }
}

function fakeClickUp(url, init) {
  const u = new URL(url)
  const auth = init?.headers?.Authorization
  calls.push({ path: u.pathname + u.search, auth })
  const userId = TOKENS[auth]
  if (!userId) return json({ err: 'Token invalid' }, 401)
  const path = u.pathname.replace('/api/v2', '')

  if (path === '/user') return json({ user: { id: userId } })
  if (path === '/team') return json({ teams: [{ id: 't1' }] })

  const list = path.match(/^\/team\/t1\/task$/)
  if (list) {
    assert.equal(u.searchParams.get('include_closed'), 'false')
    assert.equal(u.searchParams.get('subtasks'), 'true')
    const page = Number(u.searchParams.get('page'))
    // La segunda página responde una vez 429: el conector debe esperar y reintentar
    if (page === 1 && rateLimitOnce) {
      rateLimitOnce = false
      return json({ err: 'Rate limit' }, 429, { 'x-ratelimit-reset': String(Math.ceil(Date.now() / 1000)) })
    }
    const mine = u.searchParams.get('assignees[]') === '101' ? [...remote.values()] : []
    const tasks = mine.slice(page * 100, page * 100 + 100)
    return json({ tasks, last_page: (page + 1) * 100 >= mine.length })
  }

  const one = path.match(/^\/task\/(.+)$/)
  if (one) return closedRemote.has(one[1]) ? json(closedRemote.get(one[1])) : json({ err: 'Not found' }, 404)
  return json({ err: 'unknown' }, 404)
}

// --- Servidor de pruebas ------------------------------------------------------
let server
let base
const realFetch = globalThis.fetch

before(async () => {
  globalThis.fetch = (url, init) =>
    String(url).startsWith('https://api.clickup.com/') ? Promise.resolve(fakeClickUp(String(url), init)) : realFetch(url, init)
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  base = `http://127.0.0.1:${server.address().port}/api`
})

after(() => {
  globalThis.fetch = realFetch
  server.close()
})

const cookieFor = (userId) => `mp_session=${jwt.sign({ sub: userId }, process.env.JWT_SECRET)}`
const ANA = cookieFor('user-ana')
const BETO = cookieFor('user-beto')

async function call(cookie, method, path, body) {
  const res = await realFetch(`${base}${path}`, {
    method,
    headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, text, data: text ? JSON.parse(text) : null }
}

const anaTasks = () => db.task.rows.filter((t) => t.userId === 'user-ana' && t.source === 'CLICKUP')

// --- Pruebas -------------------------------------------------------------------
describe('integración con ClickUp', () => {
  before(() => {
    for (let i = 0; i < 102; i++) remote.set(`cu${i}`, clickupTask(i))
  })

  test('conectar guarda el token cifrado y nunca lo devuelve', async () => {
    const missing = await call(ANA, 'PUT', '/integrations/clickup', { category: 'ESCUELA' })
    assert.equal(missing.status, 400, 'sin token no se puede conectar por primera vez')

    const put = await call(ANA, 'PUT', '/integrations/clickup', { token: 'pk_ana' })
    assert.equal(put.status, 200)
    assert.equal(put.data.integration.status, 'connected')
    assert.equal(put.data.integration.category, 'PROYECTO')

    const row = db.integration.rows.find((r) => r.userId === 'user-ana')
    assert.match(row.tokenEnc, /^v1:/)
    assert.ok(!row.tokenEnc.includes('pk_ana'))

    const list = await call(ANA, 'GET', '/integrations')
    for (const res of [put, list]) {
      assert.ok(!res.text.includes('pk_ana'), 'la respuesta no incluye el token')
      assert.ok(!res.text.includes('tokenEnc'), 'la respuesta no incluye el token cifrado')
    }
  })

  test('dos sincronizaciones seguidas no duplican tareas', async () => {
    const first = await call(ANA, 'POST', '/integrations/clickup/sync')
    assert.equal(first.status, 200)
    assert.deepEqual(first.data.result, { ok: true, created: 102, updated: 0 })
    assert.ok(calls.every((c) => c.auth === 'pk_ana'), 'usa el token descifrado')
    assert.ok(calls.filter((c) => c.path.startsWith('/api/v2/team/t1/task')).length >= 3, 'pagina y reintenta tras 429')

    const second = await call(ANA, 'POST', '/integrations/clickup/sync')
    assert.deepEqual(second.data.result, { ok: true, created: 0, updated: 102 })
    assert.equal(anaTasks().length, 102)
    assert.equal(new Set(anaTasks().map((t) => t.externalId)).size, 102)

    const t0 = anaTasks().find((t) => t.externalId === 'cu0')
    assert.equal(t0.category, 'PROYECTO')
    assert.equal(t0.notes, 'Ver https://example.com/spec')
    assert.equal(t0.externalUrl, 'https://app.clickup.com/t/cu0')
    assert.equal(t0.dueHasTime, true)
    assert.equal(new Date(t0.dueAt).toISOString(), '2026-11-20T18:00:00.000Z')
    assert.ok(second.data.integration.lastSyncAt)

    const api = await call(ANA, 'GET', '/tasks')
    const listed = api.data.tasks.find((t) => t.title === 'Tarea 0')
    assert.equal(listed.source, 'CLICKUP')
    assert.equal(listed.externalUrl, 'https://app.clickup.com/t/cu0')
  })

  test('actualiza desde el origen, no reabre lo hecho aquí y no borra lo que desaparece', async () => {
    const local = anaTasks().find((t) => t.externalId === 'cu1')
    const patched = await call(ANA, 'PATCH', `/tasks/${local.id}`, { done: true, completedAt: new Date().toISOString() })
    assert.equal(patched.status, 200)

    remote.get('cu2').name = 'Tarea 2 (renombrada)'
    // cu3 se cierra en ClickUp: deja de salir en la lista y se consulta por id
    closedRemote.set('cu3', { ...remote.get('cu3'), status: { status: 'complete', type: 'closed' } })
    remote.delete('cu3')
    // cu4 desaparece del todo (borrada o reasignada)
    remote.delete('cu4')

    // Cambiar la categoría de la conexión se aplica en la siguiente sincronización
    await call(ANA, 'PUT', '/integrations/clickup', { category: 'ESCUELA' })
    const sync = await call(ANA, 'POST', '/integrations/clickup/sync')
    assert.equal(sync.data.result.ok, true)

    const byId = (id) => anaTasks().find((t) => t.externalId === id)
    assert.equal(byId('cu1').done, true, 'sigue hecha aunque en ClickUp esté abierta')
    assert.equal(byId('cu2').title, 'Tarea 2 (renombrada)')
    assert.equal(byId('cu2').category, 'ESCUELA')
    assert.equal(byId('cu3').done, true, 'cerrada en ClickUp → hecha aquí')
    assert.ok(byId('cu4'), 'no se borra la que desapareció')
    assert.equal(byId('cu4').done, false)
    assert.equal(anaTasks().length, 102)
  })

  test('un token inválido deja el error visible', async () => {
    await call(BETO, 'PUT', '/integrations/clickup', { token: 'pk_revocado' })
    const sync = await call(BETO, 'POST', '/integrations/clickup/sync')
    assert.equal(sync.data.result.ok, false)
    assert.match(sync.data.integration.lastError, /rechazó el token/)
    assert.equal(sync.data.integration.status, 'error')
    await call(BETO, 'DELETE', '/integrations/clickup')
  })

  test('un usuario no puede ver ni sincronizar las integraciones de otro', async () => {
    const list = await call(BETO, 'GET', '/integrations')
    assert.equal(list.data.integrations.find((i) => i.provider === 'clickup').status, 'disconnected')

    const sync = await call(BETO, 'POST', '/integrations/clickup/sync')
    assert.equal(sync.status, 404)
    const all = await call(BETO, 'POST', '/integrations/sync-all')
    assert.deepEqual(all.data.results, [])

    const tasks = await call(BETO, 'GET', '/tasks')
    assert.equal(tasks.data.tasks.length, 0)

    // Borrar "su" conexión con tareas no toca nada de Ana
    const del = await call(BETO, 'DELETE', '/integrations/clickup?deleteTasks=true')
    assert.equal(del.data.deletedTasks, 0)
    assert.ok(db.integration.rows.some((r) => r.userId === 'user-ana'))
    assert.equal(anaTasks().length, 102)

    // Si Beto conecta su propio ClickUp, importa solo lo suyo (nada) con su token
    await call(BETO, 'PUT', '/integrations/clickup', { token: 'pk_beto' })
    const own = await call(BETO, 'POST', '/integrations/clickup/sync')
    assert.deepEqual(own.data.result, { ok: true, created: 0, updated: 0 })
    assert.equal(anaTasks().length, 102)

    const anon = await realFetch(`${base}/integrations`)
    assert.equal(anon.status, 401)
  })

  test('desconectar con deleteTasks borra solo las importadas', async () => {
    await call(ANA, 'POST', '/tasks', {
      title: 'Manual',
      category: 'PERSONAL',
      priority: 'MEDIA',
      dueAt: new Date().toISOString(),
      dueHasTime: false,
    })
    const del = await call(ANA, 'DELETE', '/integrations/clickup?deleteTasks=true')
    assert.equal(del.data.deletedTasks, 102)
    assert.equal(anaTasks().length, 0)
    const left = await call(ANA, 'GET', '/tasks')
    assert.deepEqual(left.data.tasks.map((t) => t.title), ['Manual'])
    const list = await call(ANA, 'GET', '/integrations')
    assert.equal(list.data.integrations[0].status, 'disconnected')
  })
})
