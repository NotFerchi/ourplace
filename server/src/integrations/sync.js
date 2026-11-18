import { decryptToken } from '../crypto.js'
import { prisma } from '../db.js'
import { CONNECTORS } from './index.js'

/**
 * Trae las tareas del origen y las guarda con upsert por (userId, source, externalId),
 * así dos sincronizaciones seguidas no duplican nada. Reglas (v1, solo lectura):
 *  - crea y actualiza título, notas, fecha, categoría, enlace y "hecho" desde el origen
 *  - si la tarea ya está hecha aquí, no se reabre
 *  - si desaparece del origen no se borra; solo deja de actualizarse
 *
 * `integration` es la fila completa (con tokenEnc). Devuelve { ok, created, updated } o { ok: false, error }.
 */
export async function syncIntegration(integration) {
  const connector = CONNECTORS[integration.provider]
  const { id, userId, provider: source } = integration

  const pending = await prisma.task.findMany({
    where: { userId, source, done: false, externalId: { not: null } },
    select: { externalId: true },
  })

  let items
  try {
    const withSecrets = {
      ...integration,
      token: decryptToken(integration.tokenEnc),
      refreshToken: integration.refreshTokenEnc ? decryptToken(integration.refreshTokenEnc) : null,
    }
    items = await connector.fetchTasks(withSecrets, { pendingExternalIds: pending.map((t) => t.externalId) })
  } catch (err) {
    // Solo el mensaje: el error podría traer encabezados o datos de la petición
    if (!err.expose) console.error(`Sincronización ${source} falló: ${err.message}`)
    const error = err.expose ? err.message : 'No se pudo sincronizar. Intenta más tarde.'
    await prisma.integration.updateMany({ where: { id, userId }, data: { lastError: error } })
    return { ok: false, error }
  }

  const existing = await prisma.task.findMany({
    where: { userId, source, externalId: { in: items.map((i) => i.externalId) } },
    select: { externalId: true, done: true },
  })
  const doneByExternalId = new Map(existing.map((t) => [t.externalId, t.done]))

  const now = new Date()
  let created = 0
  let updated = 0
  for (const item of items) {
    const known = doneByExternalId.has(item.externalId)
    const fields = {
      title: item.title,
      notes: item.notes,
      category: item.category,
      dueHasTime: item.dueHasTime,
      externalUrl: item.externalUrl,
    }
    await prisma.task.upsert({
      where: { userId_source_externalId: { userId, source, externalId: item.externalId } },
      // Sin fecha en el origen: queda para el día en que se importó
      create: {
        ...fields,
        userId,
        source,
        externalId: item.externalId,
        dueAt: item.dueAt ?? now,
        done: item.done,
        completedAt: item.done ? now : null,
      },
      update: {
        ...fields,
        ...(item.dueAt ? { dueAt: item.dueAt } : {}),
        // Solo cierra; nunca reabre una tarea que ya está hecha aquí
        ...(item.done && !doneByExternalId.get(item.externalId) ? { done: true, completedAt: now } : {}),
      },
    })
    if (known) updated++
    else created++
  }

  await prisma.integration.updateMany({ where: { id, userId }, data: { lastSyncAt: now, lastError: null } })
  return { ok: true, created, updated }
}
