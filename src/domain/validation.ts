import type { NoteKind, Priority, ProjectStatus, TaskStatus } from './types'

export const limits = {
  taskTitle: 200,
  projectName: 150,
  projectDescription: 5000,
  commitment: 2000,
  noteTitle: 200,
  noteBody: 20000,
  assistantQuestion: 4000,
} as const

export function cleanText(value: string) {
  return value.replace(/\u0000/g, '').trim()
}

export function bounded(value: string, max: number) {
  return cleanText(value).slice(0, max)
}

export function requireText(value: string, message: string, max?: number) {
  const clean = max ? bounded(value, max) : cleanText(value)
  if (!clean) throw new Error(message)
  return clean
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return ['ready', 'progress', 'done', 'deferred', 'cancelled'].includes(value as string)
}
export function isPriority(value: unknown): value is Priority {
  return ['low', 'normal', 'important', 'urgent'].includes(value as string)
}
export function isProjectStatus(value: unknown): value is ProjectStatus {
  return ['active', 'paused', 'done'].includes(value as string)
}
export function isNoteKind(value: unknown): value is NoteKind {
  return ['note', 'idea', 'information', 'excerpt'].includes(value as string)
}
export function isFiniteTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && cleanText(value).length > 0
}
