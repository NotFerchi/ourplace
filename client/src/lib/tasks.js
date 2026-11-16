import { endOfDay, startOfDay } from './date'
import { PRIORITIES } from './constants'

const byPriorityThenDue = (a, b) =>
  Number(a.done) - Number(b.done) ||
  PRIORITIES[a.priority].weight - PRIORITIES[b.priority].weight ||
  new Date(a.dueAt) - new Date(b.dueAt)

/**
 * Separa las tareas en:
 *  - today:    vencen hoy, están atrasadas sin completar, o se completaron hoy
 *  - upcoming: vencen después de hoy y siguen pendientes
 */
export function splitTasks(tasks, now) {
  const sod = startOfDay(now).getTime()
  const eod = endOfDay(now).getTime()
  const nowMs = now.getTime()
  const completedToday = (t) => t.done && t.completedAt && new Date(t.completedAt).getTime() >= sod

  const today = []
  const upcoming = []

  for (const t of tasks) {
    const due = new Date(t.dueAt).getTime()
    if (due > eod) {
      if (!t.done) upcoming.push(t)
      else if (completedToday(t)) today.push({ ...t, overdue: false })
    } else if (due < sod) {
      if (!t.done) today.push({ ...t, overdue: true })
      else if (completedToday(t)) today.push({ ...t, overdue: false })
    } else {
      today.push({ ...t, overdue: !t.done && t.dueHasTime && due < nowMs })
    }
  }

  today.sort(byPriorityThenDue)
  upcoming.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
  return { today, upcoming }
}

/** Tareas de bienvenida: solo se crean la primera vez que abres la app. */
export function seedTasks() {
  const due = endOfDay(new Date()).toISOString()
  const base = { done: false, completedAt: null, dueAt: due, dueHasTime: false }
  const stamp = new Date().toISOString()
  return [
    { ...base, id: crypto.randomUUID(), title: 'Captura tu primera tarea con Ctrl/Cmd + K', category: 'PERSONAL', priority: 'ALTA', createdAt: stamp },
    { ...base, id: crypto.randomUUID(), title: 'Agrega un bloque a la agenda de hoy', category: 'ESCUELA', priority: 'MEDIA', createdAt: stamp },
    { ...base, id: crypto.randomUUID(), title: 'Presiona Esc para entrar al Modo Zen', category: 'PROYECTO', priority: 'BAJA', createdAt: stamp },
  ]
}
