import { describe, expect, it } from 'vitest'
import { includesSearchText } from '../src/domain/text'
import { compareTasks } from '../src/domain/sorting'
import { bounded, requireText } from '../src/domain/validation'
import type { Task } from '../src/domain/types'

const task = (id: string, priority: Task['priority'], dueAt?: number): Task => ({ id, title: id, originalText: id, description: '', status: 'ready', priority, dueAt, createdAt: 1, updatedAt: 1 })

describe('domain rules', () => {
  it('sorts priority, due dates, then stable id', () => {
    expect([task('normal', 'normal'), task('urgent', 'urgent'), task('important', 'important', 10), task('important-late', 'important', 20)].sort(compareTasks).map(item => item.id)).toEqual(['urgent', 'important', 'important-late', 'normal'])
  })
  it('normalizes Arabic search without changing source', () => {
    expect(includesSearchText('إدارة المهام', 'اداره')).toBe(true)
  })
  it('keeps validation bounded and rejects empty text', () => {
    expect(bounded('  hello  ', 5)).toBe('hello')
    expect(() => requireText('   ', 'اكتب النص')).toThrow('اكتب النص')
  })
})
