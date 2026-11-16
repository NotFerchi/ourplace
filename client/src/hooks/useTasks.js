import { useCallback } from 'react'
import { api } from '../lib/api'
import { useRemoteList } from './useRemoteList'

/** CRUD de tareas contra la API. La forma de cada tarea es la del modelo `Task` de Prisma. */
export function useTasks() {
  const { items: tasks, itemsRef, mutate } = useRemoteList('/tasks', 'tasks')

  const addTask = useCallback(
    ({ title, category, priority, dueAt, dueHasTime }) => {
      const clean = title.trim()
      if (!clean) return
      const task = {
        id: crypto.randomUUID(),
        title: clean,
        category,
        priority,
        dueAt,
        dueHasTime,
        done: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
      }
      mutate(
        (prev) => [task, ...prev],
        () => api.post('/tasks', { id: task.id, title: clean, category, priority, dueAt, dueHasTime }),
      )
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

  return { tasks, addTask, toggleTask, removeTask }
}
