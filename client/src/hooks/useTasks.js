import { useCallback } from 'react'
import { api } from '../lib/api'
import { useRemoteList } from './useRemoteList'

const cleanNotes = (notes) => notes?.trim() || null

/** CRUD de tareas contra la API. La forma de cada tarea es la del modelo `Task` de Prisma. */
export function useTasks() {
  const { items: tasks, itemsRef, mutate, refresh: refreshTasks } = useRemoteList('/tasks', 'tasks')

  const addTask = useCallback(
    ({ title, notes, category, priority, dueAt, dueHasTime }) => {
      const clean = title.trim()
      if (!clean) return
      const fields = { title: clean, notes: cleanNotes(notes), category, priority, dueAt, dueHasTime }
      const task = {
        id: crypto.randomUUID(),
        ...fields,
        done: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
      }
      mutate(
        (prev) => [task, ...prev],
        () => api.post('/tasks', { id: task.id, ...fields }),
      )
    },
    [mutate],
  )

  /** Edita título, notas, categoría, prioridad o fecha de una tarea. */
  const editTask = useCallback(
    (id, changes) => {
      const patch = { ...changes }
      if ('title' in patch) {
        patch.title = patch.title.trim()
        if (!patch.title) return false
      }
      if ('notes' in patch) patch.notes = cleanNotes(patch.notes)
      mutate(
        (prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        () => api.patch(`/tasks/${id}`, patch),
      )
      return true
    },
    [mutate],
  )

  const toggleTask = useCallback(
    (id) => {
      const current = itemsRef.current.find((t) => t.id === id)
      if (!current) return
      const done = !current.done
      const completedAt = done ? new Date().toISOString() : null
      mutate(
        (prev) => prev.map((t) => (t.id === id ? { ...t, done, completedAt } : t)),
        () => api.patch(`/tasks/${id}`, { done, completedAt }),
      )
    },
    [mutate, itemsRef],
  )

  const removeTask = useCallback(
    (id) =>
      mutate(
        (prev) => prev.filter((t) => t.id !== id),
        () => api.del(`/tasks/${id}`),
      ),
    [mutate],
  )

  return { tasks, addTask, editTask, toggleTask, removeTask, refreshTasks }
}
