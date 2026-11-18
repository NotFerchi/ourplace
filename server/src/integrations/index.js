import clickup from './clickup.js'

/**
 * Conectores disponibles. Cada uno cumple la misma interfaz:
 *
 *   {
 *     provider: 'CLICKUP',            // valor del enum Provider (y de Source en Task)
 *     label: 'ClickUp',
 *     defaultCategory: 'PROYECTO',
 *     // `integration` trae el token ya descifrado en `token` (solo en memoria).
 *     // `ctx.pendingExternalIds`: ids importados que siguen pendientes, por si el
 *     // origen deja de listarlos al cerrarse y hay que consultarlos uno por uno.
 *     fetchTasks(integration, ctx) → [{ externalId, title, notes, dueAt, dueHasTime, category, done, externalUrl }]
 *   }
 *
 * Para mostrar un error al usuario, el conector lanza un Error con `expose: true`
 * (ver syncError); cualquier otro error se reporta como genérico.
 */
export const CONNECTORS = { CLICKUP: clickup }

/** Conector a partir del parámetro de la URL ("clickup"), o null si no existe. */
export const connectorFor = (slug) => CONNECTORS[String(slug).toUpperCase()] ?? null

/** Error con un mensaje apto para mostrarse en el panel de Conexiones. */
export const syncError = (message) => Object.assign(new Error(message), { expose: true })
