import { get, put } from '../data/repository'
import type { AssistantAction, Note, ProjectStep, Task } from '../domain/types'
import { now, uid } from '../domain/types'

const allowedKinds = new Set<AssistantAction['kind']>(['create_task', 'update_task', 'set_task_status', 'create_note', 'update_note', 'add_project_step', 'update_project_step'])
const taskFields = new Set(['title', 'description', 'priority', 'status', 'dueAt'])
const noteFields = new Set(['title', 'body', 'kind'])
const stepFields = new Set(['title', 'done', 'order'])

export function parseAssistantAction(text: string): AssistantAction | undefined {
  const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/)
  if (!match) return undefined
  try {
    const parsed = JSON.parse(match[1] ?? match[0]) as AssistantAction
    if (!parsed || typeof parsed !== 'object' || typeof parsed.kind !== 'string' || typeof parsed.fields !== 'object') return undefined
    return validateAssistantAction(parsed)
  } catch { return undefined }
}

export function validateAssistantAction(action: AssistantAction) {
  if (!allowedKinds.has(action.kind)) throw new Error('المساعد اقترح إجراء غير مسموح.')
  const fields = Object.keys(action.fields)
  const allowed = action.kind.includes('task') ? taskFields : action.kind.includes('note') ? noteFields : stepFields
  if (fields.some(field => !allowed.has(field))) throw new Error('الإجراء يحتوي على حقل غير مسموح.')
  if (action.kind !== 'create_task' && action.kind !== 'create_note' && action.kind !== 'add_project_step' && !action.targetId) throw new Error('لم يحدد الاقتراح السجل المطلوب تعديله.')
  if (action.kind === 'add_project_step' && !action.targetId) throw new Error('لم يحدد الاقتراح المشروع المطلوب.')
  return action
}

export async function executeAssistantAction(action: AssistantAction) {
  validateAssistantAction(action)
  const timestamp = now()
  if (action.kind === 'create_task') {
    const title = String(action.fields.title ?? '').trim()
    if (!title) throw new Error('عنوان المهمة المقترحة فارغ.')
    const task: Task = { id: uid(), title, originalText: title, description: String(action.fields.description ?? ''), status: action.fields.status === 'progress' ? 'progress' : 'ready', priority: action.fields.priority === 'urgent' || action.fields.priority === 'important' || action.fields.priority === 'low' ? action.fields.priority : 'normal', dueAt: typeof action.fields.dueAt === 'number' ? action.fields.dueAt : undefined, createdAt: timestamp, updatedAt: timestamp }
    await put('tasks', task)
    return { store: 'tasks' as const, id: task.id }
  }
  if (action.kind === 'update_task' || action.kind === 'set_task_status') {
    const existing = await get('tasks', action.targetId!)
    if (!existing) throw new Error('المهمة المقصودة لم تعد موجودة.')
    const next: Task = { ...existing, ...action.fields, updatedAt: timestamp } as Task
    if (action.kind === 'set_task_status') next.status = action.fields.status as Task['status']
    await put('tasks', next)
    return { store: 'tasks' as const, id: next.id }
  }
  if (action.kind === 'create_note') {
    const title = String(action.fields.title ?? '').trim()
    if (!title) throw new Error('عنوان الملاحظة المقترحة فارغ.')
    const note: Note = { id: uid(), title, body: String(action.fields.body ?? ''), kind: action.fields.kind === 'idea' || action.fields.kind === 'information' || action.fields.kind === 'excerpt' ? action.fields.kind : 'note', createdAt: timestamp, updatedAt: timestamp }
    await put('notes', note)
    return { store: 'notes' as const, id: note.id }
  }
  if (action.kind === 'update_note') {
    const existing = await get('notes', action.targetId!)
    if (!existing) throw new Error('الملاحظة المقصودة لم تعد موجودة.')
    const next: Note = { ...existing, ...action.fields, updatedAt: timestamp } as Note
    await put('notes', next)
    return { store: 'notes' as const, id: next.id }
  }
  const existing = await get('steps', action.targetId!)
  if (action.kind === 'add_project_step') {
    const title = String(action.fields.title ?? '').trim()
    if (!title) throw new Error('عنوان خطوة المشروع فارغ.')
    const step: ProjectStep = { id: uid(), projectId: action.targetId!, title, done: false, order: typeof action.fields.order === 'number' ? action.fields.order : 0, createdAt: timestamp, updatedAt: timestamp }
    await put('steps', step)
    return { store: 'steps' as const, id: step.id }
  }
  if (!existing) throw new Error('خطوة المشروع المقصودة لم تعد موجودة.')
  const next: ProjectStep = { ...existing, ...action.fields, updatedAt: timestamp } as ProjectStep
  await put('steps', next)
  return { store: 'steps' as const, id: next.id }
}
