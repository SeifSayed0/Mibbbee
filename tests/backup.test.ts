import { beforeEach, describe, expect, it } from 'vitest'
import { closeDbForTests, getDb } from '../src/data/db'
import { put } from '../src/data/repository'
import { createBackup, validateBackup } from '../src/services/backup'

describe('backup safety', () => {
  beforeEach(async () => {
    const db = await getDb()
    for (const store of ['tasks', 'inbox', 'projects', 'steps', 'people', 'commitments', 'notes', 'reviews', 'preferences'] as const) await db.clear(store)
  })

  it('never exports the Gemini key', async () => {
    await put('preferences', { key: 'geminiKey', value: 'secret', updatedAt: Date.now() })
    await put('preferences', { key: 'theme', value: 'dark', updatedAt: Date.now() })
    const backup = await createBackup()
    expect(backup.data.preferences).toEqual([{ key: 'theme', value: 'dark', updatedAt: expect.any(Number) }])
    await closeDbForTests()
  })

  it('rejects a backup that tries to import the Gemini key or an invalid entity', () => {
    const base = { app: 'Mine OS', backupFormatVersion: 1, databaseSchemaVersion: 1, exportedAt: new Date().toISOString(), data: { tasks: [], inbox: [], projects: [], steps: [], people: [], commitments: [], notes: [], reviews: [], preferences: [{ key: 'geminiKey', value: 'secret', updatedAt: Date.now() }] } }
    expect(() => validateBackup(base)).toThrow('مفتاح Gemini')
  })
})
