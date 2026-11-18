import { setTimeout as sleep } from 'node:timers/promises'
import { syncError as userError } from './index.js'

// ClickUp API v2 con token personal (Settings → Apps). Solo lectura.
// Límite de ClickUp: ~100 peticiones por minuto por token; los encabezados
// X-RateLimit-Remaining / X-RateLimit-Reset (segundos Unix) dicen cuánto queda.
const API = 'https://api.clickup.com/api/v2'
const PAGE_SIZE = 100 // ClickUp devuelve hasta 100 tareas por página
const MAX_PAGES = 30 // tope de seguridad por workspace
const MAX_RECHECKS = 50 // tareas desaparecidas que se consultan una por una en cada sync
const MAX_WAIT_MS = 60_000

const TITLE_MAX = 200
const NOTES_MAX = 2000

function waitForReset(res) {
  const reset = Number(res.headers.get('x-ratelimit-reset'))
  const ms = reset ? reset * 1000 - Date.now() : 5000
  return Math.min(MAX_WAIT_MS, Math.max(1000, ms))
}

/** GET a la API. Devuelve el JSON, o null si el recurso no existe (404). */
async function get(token, path) {
  for (let attempt = 0; ; attempt++) {
    let res
    try {
      res = await fetch(`${API}${path}`, { headers: { Authorization: token, Accept: 'application/json' } })
    } catch {
      throw userError('No se pudo conectar con ClickUp. Intenta más tarde.')
    }
    if (res.status === 429 && attempt < 2) {
      await sleep(waitForReset(res))
      continue
    }
    if (res.status === 401 || res.status === 403) {
      throw userError('ClickUp rechazó el token. Revisa que sea tu token personal vigente.')
    }
    if (res.status === 404) return null
    if (res.status === 429) throw userError('ClickUp pidió esperar (límite de peticiones). Intenta en un minuto.')
    if (!res.ok) throw userError(`ClickUp respondió con un error (${res.status}). Intenta más tarde.`)

    const data = await res.json()
    // Si se agotó la cuota, espera antes de la siguiente petición
    const remaining = res.headers.get('x-ratelimit-remaining')
    if (remaining !== null && Number(remaining) <= 0) await sleep(waitForReset(res))
    return data
  }
}

const isClosed = (t) => ['closed', 'done'].includes(t.status?.type)

function toTask(t, category) {
  const due = t.due_date ? new Date(Number(t.due_date)) : null
  return {
    externalId: String(t.id),
    title: (t.name?.trim() || '(sin título)').slice(0, TITLE_MAX),
    notes: (t.description ?? t.text_content ?? '').trim().slice(0, NOTES_MAX) || null,
    dueAt: due && !Number.isNaN(due.getTime()) ? due : null,
    dueHasTime: Boolean(due && t.due_date_time),
    category,
    done: isClosed(t),
    externalUrl: typeof t.url === 'string' && t.url.startsWith('https://') ? t.url : null,
  }
}

async function fetchTasks(integration, { pendingExternalIds = [] } = {}) {
  const { token } = integration
  const category = integration.config?.category ?? 'PROYECTO'

  const me = await get(token, '/user')
  const userId = me?.user?.id
  if (!userId) throw userError('ClickUp no devolvió tu usuario. Revisa el token.')
  const { teams = [] } = (await get(token, '/team')) ?? {}

  const found = new Map()
  for (const team of teams) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const query = new URLSearchParams({ page: String(page), subtasks: 'true', include_closed: 'false' })
      query.append('assignees[]', String(userId))
      const data = await get(token, `/team/${encodeURIComponent(team.id)}/task?${query}`)
      const tasks = data?.tasks ?? []
      for (const t of tasks) found.set(String(t.id), toTask(t, category))
      if (data?.last_page === true || tasks.length < PAGE_SIZE) break
    }
  }

  // Con include_closed=false, una tarea cerrada deja de aparecer en la lista:
  // se consultan las que seguían pendientes aquí para traer su estado "hecho".
  const missing = pendingExternalIds.filter((id) => !found.has(id)).slice(0, MAX_RECHECKS)
  for (const id of missing) {
    const t = await get(token, `/task/${encodeURIComponent(id)}`)
    if (t && isClosed(t)) found.set(id, toTask(t, category))
  }

  return [...found.values()]
}

export default { provider: 'CLICKUP', label: 'ClickUp', defaultCategory: 'PROYECTO', fetchTasks }
