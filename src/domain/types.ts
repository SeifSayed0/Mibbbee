export type TaskStatus = 'ready' | 'progress' | 'done' | 'deferred' | 'cancelled'
export type Priority = 'low' | 'normal' | 'important' | 'urgent'
export type ProjectStatus = 'active' | 'paused' | 'done'
export type NoteKind = 'note' | 'idea' | 'information' | 'excerpt'
export type ReviewKind = 'general'
export type ReminderStatus = 'active' | 'done' | 'cancelled'
export type ReminderTarget = 'task' | 'project'
export type AssistantActionKind = 'create_task' | 'update_task' | 'set_task_status' | 'create_note' | 'update_note' | 'add_project_step' | 'update_project_step'

export type Task = {
  id: string; title: string; originalText: string; description: string
  status: TaskStatus; priority: Priority; dueAt?: number
  createdAt: number; updatedAt: number; completedAt?: number
}
export type InboxItem = { id: string; originalText: string; createdAt: number }
export type Project = {
  id: string; name: string; description: string; goal: string; nextStep: string
  status: ProjectStatus; createdAt: number; updatedAt: number
}
export type ProjectStep = { id: string; projectId: string; title: string; done: boolean; order: number; createdAt: number; updatedAt: number }
export type Person = { id: string; name: string; description: string; contact: string; notes: string; createdAt: number; updatedAt: number }
export type Commitment = { id: string; personId?: string; originalText: string; status: 'open' | 'done'; createdAt: number; updatedAt: number; followUpAt?: number; completedAt?: number }
export type Note = { id: string; title: string; body: string; kind: NoteKind; createdAt: number; updatedAt: number }
export type Review = { id: string; kind: ReviewKind; reflection: string; createdAt: number; updatedAt: number }
export type Reminder = { id: string; title: string; remindAt: number; timezone: string; status: ReminderStatus; targetType?: ReminderTarget; targetId?: string; createdAt: number; updatedAt: number; completedAt?: number; cancelledAt?: number }
export type AssistantAction = { id: string; kind: AssistantActionKind; targetId?: string; targetLabel?: string; fields: Record<string, string | number | boolean | null>; summary: string }
export type PreferenceValue = string | boolean | number | null
export type Preference = { key: string; value: PreferenceValue; updatedAt: number }

export type StoreName = 'tasks' | 'inbox' | 'projects' | 'steps' | 'people' | 'commitments' | 'notes' | 'reviews' | 'preferences' | 'reminders'
export type Entity = Task | InboxItem | Project | ProjectStep | Person | Commitment | Note | Review | Preference | Reminder
export type SearchResultType = 'task' | 'inbox' | 'project' | 'person' | 'commitment' | 'note' | 'review'
export type SearchResult = { type: SearchResultType; id: string; title: string; context: string; updatedAt?: number }

export const uid = () => crypto.randomUUID()
export const now = () => Date.now()
