import { getDb } from '../data/db'
import { stores } from '../data/repository'
import type { StoreName } from '../domain/types'

export const backupFormatVersion = 2

export type BackupFile = {
  app: 'Mine OS'
  backupFormatVersion: number
  databaseSchemaVersion: number
  exportedAt: string
  data: Record<StoreName, unknown[]>
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function stringField(item: Record<string, unknown>, key: string, store: StoreName) { if (typeof item[key] !== 'string') throw new Error(`الحقل ${key} غير صالح داخل ${store}.`) }
function timeField(item: Record<string, unknown>, key: string, store: StoreName) { if (typeof item[key] !== 'number' || !Number.isFinite(item[key])) throw new Error(`التاريخ ${key} غير صالح داخل ${store}.`) }
function booleanField(item: Record<string, unknown>, key: string, store: StoreName) { if (typeof item[key] !== 'boolean') throw new Error(`الحقل ${key} غير صالح داخل ${store}.`) }
function validateEntity(store: StoreName, item: Record<string, unknown>) {
  if (store === 'preferences') { stringField(item, 'key', store); if (!('value' in item)) throw new Error(`التفضيل داخل ${store} بلا قيمة.`); if (item.key === 'geminiKey') throw new Error('لا يُسمح بإدخال مفتاح Gemini في نسخة احتياطية.'); return }
  stringField(item, 'id', store)
  if (store === 'tasks') { stringField(item, 'title', store); stringField(item, 'originalText', store); stringField(item, 'description', store); stringField(item, 'status', store); stringField(item, 'priority', store); timeField(item, 'createdAt', store); timeField(item, 'updatedAt', store) }
  if (store === 'inbox') { stringField(item, 'originalText', store); timeField(item, 'createdAt', store) }
  if (store === 'projects') { stringField(item, 'name', store); stringField(item, 'description', store); stringField(item, 'goal', store); stringField(item, 'nextStep', store); stringField(item, 'status', store); timeField(item, 'createdAt', store); timeField(item, 'updatedAt', store) }
  if (store === 'steps') { stringField(item, 'projectId', store); stringField(item, 'title', store); booleanField(item, 'done', store); timeField(item, 'createdAt', store); timeField(item, 'updatedAt', store) }
  if (store === 'people') { stringField(item, 'name', store); stringField(item, 'description', store); stringField(item, 'contact', store); stringField(item, 'notes', store); timeField(item, 'createdAt', store); timeField(item, 'updatedAt', store) }
  if (store === 'commitments') { stringField(item, 'originalText', store); stringField(item, 'status', store); timeField(item, 'createdAt', store); timeField(item, 'updatedAt', store) }
  if (store === 'notes') { stringField(item, 'title', store); stringField(item, 'body', store); stringField(item, 'kind', store); timeField(item, 'createdAt', store); timeField(item, 'updatedAt', store) }
  if (store === 'reviews') { stringField(item, 'kind', store); stringField(item, 'reflection', store); timeField(item, 'createdAt', store); timeField(item, 'updatedAt', store) }
  if (store === 'reminders') { stringField(item, 'title', store); timeField(item, 'remindAt', store); stringField(item, 'timezone', store); stringField(item, 'status', store); timeField(item, 'createdAt', store); timeField(item, 'updatedAt', store) }
}

export async function createBackup(): Promise<BackupFile> {
  const db = await getDb()
  const data = {} as Record<StoreName, unknown[]>
  for (const store of stores) data[store] = await db.getAll(store)
  data.preferences = data.preferences.filter(item => (item as { key?: unknown }).key !== 'geminiKey')
  return { app: 'Mine OS', backupFormatVersion, databaseSchemaVersion: 2, exportedAt: new Date().toISOString(), data }
}

export function validateBackup(input: unknown): BackupFile {
  if (!isRecord(input) || input.app !== 'Mine OS' || ![1, 2].includes(input.backupFormatVersion as number) || ![1, 2].includes(input.databaseSchemaVersion as number) || !isRecord(input.data)) throw new Error('ملف النسخة الاحتياطية غير صالح أو غير مدعوم.')
  const data = {} as Record<StoreName, unknown[]>
  const inputVersion = input.backupFormatVersion as number
  const ids = new Set<string>()
  for (const store of stores) {
    if (store === 'reminders' && inputVersion === 1 && input.data[store] === undefined) data[store] = []
    else if (!Array.isArray(input.data[store])) throw new Error(`بيانات ${store} غير صالحة داخل النسخة.`)
    else data[store] = input.data[store] as unknown[]
    for (const item of data[store]) {
      if (!isRecord(item)) throw new Error(`سجل غير صالح داخل ${store}.`)
      validateEntity(store, item)
      const key = store === 'preferences' ? item.key : item.id
      const compound = `${store}:${String(key)}`
      if (ids.has(compound)) throw new Error(`معرّف مكرر داخل ${store}.`)
      ids.add(compound)
    }
  }
  const projectIds = new Set((data.projects as Array<{ id: string }>).map(item => item.id))
  for (const step of data.steps as Array<{ projectId: string }>) if (!projectIds.has(step.projectId)) throw new Error('توجد خطوة مرتبطة بمشروع غير موجود.')
  const peopleIds = new Set((data.people as Array<{ id: string }>).map(item => item.id))
  for (const commitment of data.commitments as Array<{ personId?: unknown }>) if (commitment.personId !== undefined && (typeof commitment.personId !== 'string' || !peopleIds.has(commitment.personId))) throw new Error('يوجد التزام مرتبط بشخص غير موجود.')
  return { app: 'Mine OS', backupFormatVersion, databaseSchemaVersion: 2, exportedAt: String(input.exportedAt ?? ''), data }
}

function recordKey(store: StoreName, item: unknown) { if (!isRecord(item)) return undefined; const key = store === 'preferences' ? item.key : item.id; return typeof key === 'string' ? key : undefined }
function updatedAt(item: unknown) { return isRecord(item) && typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : undefined }

export async function restoreBackup(raw: string, mode: 'merge' | 'replace') {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('لم نتمكن من قراءة ملف JSON.') }
  const backup = validateBackup(parsed)
  const db = await getDb()
  const tx = db.transaction(stores, 'readwrite')
  const summary = { added: 0, updated: 0, skipped: 0, conflicts: 0 }
  if (mode === 'replace') for (const store of stores) await tx.objectStore(store).clear()
  for (const store of stores) {
    const objectStore = tx.objectStore(store)
    for (const incoming of backup.data[store]) {
      const key = recordKey(store, incoming)
      if (!key) { summary.skipped++; continue }
      if (mode === 'replace') { await objectStore.put(incoming as never); summary.added++; continue }
      const local = await objectStore.get(key as never) as unknown
      if (!local) { await objectStore.put(incoming as never); summary.added++; continue }
      const incomingTime = updatedAt(incoming); const localTime = updatedAt(local)
      if (incomingTime !== undefined && localTime !== undefined && incomingTime > localTime) { await objectStore.put(incoming as never); summary.updated++ }
      else if (incomingTime === undefined || localTime === undefined) { summary.skipped++; summary.conflicts++ }
      else summary.skipped++
    }
  }
  await tx.done
  return summary
}
