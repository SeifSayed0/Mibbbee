import type { IDBPTransaction } from 'idb'
import { getDb, type MineDb } from './db'
import type { Commitment, Entity, InboxItem, Note, Person, Preference, Project, ProjectStep, Reminder, Review, StoreName, Task } from '../domain/types'
import { now } from '../domain/types'

export const stores: StoreName[] = ['tasks', 'inbox', 'projects', 'steps', 'people', 'commitments', 'notes', 'reviews', 'preferences', 'reminders']

type StoreValue<S extends StoreName> = S extends 'tasks' ? Task : S extends 'inbox' ? InboxItem : S extends 'projects' ? Project : S extends 'steps' ? ProjectStep : S extends 'people' ? Person : S extends 'commitments' ? Commitment : S extends 'notes' ? Note : S extends 'reviews' ? Review : S extends 'reminders' ? Reminder : Preference

type ReadWriteTx = IDBPTransaction<MineDb, StoreName[], 'readwrite'>

export async function all<S extends StoreName>(store: S): Promise<StoreValue<S>[]> {
  return (await getDb()).getAll(store) as Promise<StoreValue<S>[]>
}

export async function get<S extends StoreName>(store: S, key: string) {
  return (await getDb()).get(store, key) as Promise<StoreValue<S> | undefined>
}

export async function put<S extends StoreName>(store: S, item: StoreValue<S>) {
  return (await getDb()).put(store, item as never)
}

export async function remove(store: StoreName, id: string) {
  return (await getDb()).delete(store, id)
}

export async function clear(store: StoreName) {
  return (await getDb()).clear(store)
}

export async function updateReminderStatus(id: string, status: Reminder['status']) {
  const reminder = await get('reminders', id)
  if (!reminder) throw new Error('التذكير المطلوب غير موجود.')
  const timestamp = now()
  return put('reminders', { ...reminder, status, updatedAt: timestamp, completedAt: status === 'done' ? timestamp : undefined, cancelledAt: status === 'cancelled' ? timestamp : undefined })
}

export async function getPreference<T extends Preference['value'] = Preference['value']>(key: string) {
  const item = await get('preferences', key)
  return item?.value as T | undefined
}

export async function savePreference(key: string, value: Preference['value']) {
  return put('preferences', { key, value, updatedAt: now() })
}

export async function convertInbox(id: string, target: 'task' | 'note' | 'commitment', source: InboxItem) {
  const db = await getDb()
  const tx = db.transaction(['inbox', 'tasks', 'notes', 'commitments'], 'readwrite') as ReadWriteTx
  const created = now()
  if (target === 'task') {
    await tx.objectStore('tasks').put({ id: crypto.randomUUID(), title: source.originalText, originalText: source.originalText, description: '', status: 'ready', priority: 'normal', createdAt: created, updatedAt: created })
  } else if (target === 'note') {
    await tx.objectStore('notes').put({ id: crypto.randomUUID(), title: 'من الوارد', body: source.originalText, kind: 'note', createdAt: created, updatedAt: created })
  } else {
    await tx.objectStore('commitments').put({ id: crypto.randomUUID(), originalText: source.originalText, status: 'open', createdAt: created, updatedAt: created })
  }
  await tx.objectStore('inbox').delete(id)
  await tx.done
}

export async function deletePersonAndUnlink(personId: string) {
  const db = await getDb()
  const tx = db.transaction(['people', 'commitments'], 'readwrite') as ReadWriteTx
  const commitments = await tx.objectStore('commitments').index('by-person').getAll(personId)
  for (const commitment of commitments) await tx.objectStore('commitments').put({ ...commitment, personId: undefined, updatedAt: now() })
  await tx.objectStore('people').delete(personId)
  await tx.done
}

export function asEntity(value: unknown) {
  return value as Entity
}
