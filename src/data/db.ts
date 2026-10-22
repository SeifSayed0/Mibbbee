import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Commitment, InboxItem, Note, Person, Preference, Project, ProjectStep, Reminder, Review, Task } from '../domain/types'

export const DATABASE_NAME = 'mine-os'
export const DATABASE_SCHEMA_VERSION = 2

export interface MineDb extends DBSchema {
  tasks: { key: string; value: Task; indexes: { 'by-status': string; 'by-due': number; 'by-updated': number } }
  inbox: { key: string; value: InboxItem; indexes: { 'by-created': number } }
  projects: { key: string; value: Project; indexes: { 'by-status': string; 'by-updated': number } }
  steps: { key: string; value: ProjectStep; indexes: { 'by-project': string; 'by-order': number } }
  people: { key: string; value: Person; indexes: { 'by-updated': number } }
  commitments: { key: string; value: Commitment; indexes: { 'by-person': string; 'by-status': string; 'by-follow-up': number } }
  notes: { key: string; value: Note; indexes: { 'by-updated': number; 'by-kind': string } }
  reviews: { key: string; value: Review; indexes: { 'by-created': number } }
  preferences: { key: string; value: Preference }
  reminders: { key: string; value: Reminder; indexes: { 'by-remind-at': number; 'by-status': string; 'by-updated': number } }
}

let dbPromise: Promise<IDBPDatabase<MineDb>> | undefined

function createIndex(store: any, name: string, keyPath: string) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath)
}

export function getDb() {
  dbPromise ??= openDB<MineDb>(DATABASE_NAME, DATABASE_SCHEMA_VERSION, {
    upgrade(db) {
      const tasks = db.objectStoreNames.contains('tasks') ? undefined : db.createObjectStore('tasks', { keyPath: 'id' })
      if (tasks) { createIndex(tasks, 'by-status', 'status'); createIndex(tasks, 'by-due', 'dueAt'); createIndex(tasks, 'by-updated', 'updatedAt') }
      const inbox = db.objectStoreNames.contains('inbox') ? undefined : db.createObjectStore('inbox', { keyPath: 'id' })
      if (inbox) createIndex(inbox, 'by-created', 'createdAt')
      const projects = db.objectStoreNames.contains('projects') ? undefined : db.createObjectStore('projects', { keyPath: 'id' })
      if (projects) { createIndex(projects, 'by-status', 'status'); createIndex(projects, 'by-updated', 'updatedAt') }
      const steps = db.objectStoreNames.contains('steps') ? undefined : db.createObjectStore('steps', { keyPath: 'id' })
      if (steps) { createIndex(steps, 'by-project', 'projectId'); createIndex(steps, 'by-order', 'order') }
      const people = db.objectStoreNames.contains('people') ? undefined : db.createObjectStore('people', { keyPath: 'id' })
      if (people) createIndex(people, 'by-updated', 'updatedAt')
      const commitments = db.objectStoreNames.contains('commitments') ? undefined : db.createObjectStore('commitments', { keyPath: 'id' })
      if (commitments) { createIndex(commitments, 'by-person', 'personId'); createIndex(commitments, 'by-status', 'status'); createIndex(commitments, 'by-follow-up', 'followUpAt') }
      const notes = db.objectStoreNames.contains('notes') ? undefined : db.createObjectStore('notes', { keyPath: 'id' })
      if (notes) { createIndex(notes, 'by-updated', 'updatedAt'); createIndex(notes, 'by-kind', 'kind') }
      const reviews = db.objectStoreNames.contains('reviews') ? undefined : db.createObjectStore('reviews', { keyPath: 'id' })
      if (reviews) createIndex(reviews, 'by-created', 'createdAt')
      if (!db.objectStoreNames.contains('preferences')) db.createObjectStore('preferences', { keyPath: 'key' })
      const reminders = db.objectStoreNames.contains('reminders') ? undefined : db.createObjectStore('reminders', { keyPath: 'id' })
      if (reminders) { createIndex(reminders, 'by-remind-at', 'remindAt'); createIndex(reminders, 'by-status', 'status'); createIndex(reminders, 'by-updated', 'updatedAt') }
    },
  })
  return dbPromise
}

export async function closeDbForTests() {
  const db = await dbPromise
  db?.close()
  dbPromise = undefined
}
