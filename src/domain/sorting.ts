import type { Task } from './types'

const rank = { urgent: 4, important: 3, normal: 2, low: 1 } as const

export function compareTasks(a: Task, b: Task) {
  const priority = rank[b.priority] - rank[a.priority]
  if (priority) return priority
  const aHasDue = typeof a.dueAt === 'number'
  const bHasDue = typeof b.dueAt === 'number'
  if (aHasDue !== bHasDue) return aHasDue ? -1 : 1
  if (aHasDue && bHasDue && a.dueAt !== b.dueAt) return (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
  return a.id.localeCompare(b.id)
}

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort(compareTasks)
}
