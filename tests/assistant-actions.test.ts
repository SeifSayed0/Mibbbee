import { describe, expect, it } from 'vitest'
import { parseAssistantAction, validateAssistantAction } from '../src/services/assistantActions'

describe('assistant action safety', () => {
  it('parses an allowed proposal', () => {
    const action = parseAssistantAction('```json\n{"id":"p1","kind":"create_task","fields":{"title":"اتصل بسارة"},"summary":"إنشاء مهمة للاتصال بسارة"}\n```')
    expect(action?.kind).toBe('create_task')
  })
  it('rejects unsupported fields and destructive kinds', () => {
    expect(() => validateAssistantAction({ id: 'p1', kind: 'create_task', fields: { sql: 'delete' }, summary: 'x' })).toThrow()
    expect(() => validateAssistantAction({ id: 'p1', kind: 'delete_task' as never, fields: {}, summary: 'x' })).toThrow()
  })
  it('does not parse free-form text as an action', () => {
    expect(parseAssistantAction('أنشئ مهمة من فضلك')).toBeUndefined()
  })
})
