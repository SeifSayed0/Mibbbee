import { all } from '../data/repository'
import { includesSearchText } from '../domain/text'
import type { SearchResult } from '../domain/types'

export async function searchLocal(query: string): Promise<SearchResult[]> {
  const needle = query.trim()
  if (!needle) return []
  const [tasks, inbox, projects, people, commitments, notes, reviews] = await Promise.all([
    all('tasks'), all('inbox'), all('projects'), all('people'), all('commitments'), all('notes'), all('reviews'),
  ])
  const results: SearchResult[] = []
  for (const item of tasks) if (includesSearchText(`${item.title} ${item.description} ${item.originalText}`, needle)) results.push({ type: 'task', id: item.id, title: item.title, context: `${item.priority} · ${item.status}`, updatedAt: item.updatedAt })
  for (const item of inbox) if (includesSearchText(item.originalText, needle)) results.push({ type: 'inbox', id: item.id, title: item.originalText, context: 'الوارد', updatedAt: item.createdAt })
  for (const item of projects) if (includesSearchText(`${item.name} ${item.description} ${item.goal} ${item.nextStep}`, needle)) results.push({ type: 'project', id: item.id, title: item.name, context: item.nextStep || 'مشروع', updatedAt: item.updatedAt })
  for (const item of people) if (includesSearchText(`${item.name} ${item.description} ${item.contact} ${item.notes}`, needle)) results.push({ type: 'person', id: item.id, title: item.name, context: item.contact || 'شخص', updatedAt: item.updatedAt })
  for (const item of commitments) if (includesSearchText(item.originalText, needle)) results.push({ type: 'commitment', id: item.id, title: item.originalText, context: item.status === 'open' ? 'التزام مفتوح' : 'التزام مكتمل', updatedAt: item.updatedAt })
  for (const item of notes) if (includesSearchText(`${item.title} ${item.body} ${item.kind}`, needle)) results.push({ type: 'note', id: item.id, title: item.title, context: item.kind, updatedAt: item.updatedAt })
  for (const item of reviews) if (includesSearchText(item.reflection, needle)) results.push({ type: 'review', id: item.id, title: 'مراجعة شخصية', context: item.reflection.slice(0, 80), updatedAt: item.createdAt })
  return results.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 40)
}
