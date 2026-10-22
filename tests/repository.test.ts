import { beforeEach, describe, expect, it } from 'vitest'
import { closeDbForTests, getDb } from '../src/data/db'
import { all, convertInbox, deletePersonAndUnlink, put } from '../src/data/repository'

describe('repository workflows', () => {
  beforeEach(async () => {
    const db = await getDb()
    for (const store of ['tasks', 'inbox', 'projects', 'steps', 'people', 'commitments', 'notes', 'reviews', 'preferences', 'reminders'] as const) await db.clear(store)
  })

  it('converts inbox only through an atomic successful operation', async () => {
    const item = { id: 'inbox-1', originalText: 'راجع الملف', createdAt: Date.now() }
    await put('inbox', item)
    await convertInbox(item.id, 'task', item)
    expect((await all('inbox')).length).toBe(0)
    expect((await all('tasks'))[0]?.originalText).toBe('راجع الملف')
  })

  it('keeps commitments while unlinking deleted people', async () => {
    await put('people', { id: 'p1', name: 'سارة', description: '', contact: '', notes: '', createdAt: 1, updatedAt: 1 })
    await put('commitments', { id: 'c1', personId: 'p1', originalText: 'أرسل الرسالة', status: 'open', createdAt: 1, updatedAt: 1 })
    await deletePersonAndUnlink('p1')
    expect((await all('people')).length).toBe(0)
    expect((await all('commitments'))[0]?.personId).toBeUndefined()
    await closeDbForTests()
  })
})
