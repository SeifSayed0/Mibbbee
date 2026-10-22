import type { Commitment, Note, Project, Task } from '../domain/types'
import { sortTasks } from '../domain/sorting'

const MODEL = 'gemini-3.8-flash'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'

export type AssistantContext = { tasks: Task[]; project?: Project; commitments: Commitment[]; notes: Note[] }
type GeminiErrorBody = { error?: { code?: number; message?: string; status?: string } }
type InteractionResponse = { output_text?: string; steps?: Array<{ type?: string; text?: string; content?: Array<{ type?: string; text?: string }> }> }

export function buildContext(context: AssistantContext) {
  const tasks = sortTasks(context.tasks.filter(item => !['done', 'cancelled'].includes(item.status))).slice(0, 3).map(item => ({ title: item.title, status: item.status, priority: item.priority, dueAt: item.dueAt }))
  const commitments = context.commitments.filter(item => item.status === 'open').slice(0, 2).map(item => ({ text: item.originalText, followUpAt: item.followUpAt }))
  const notes = context.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3).map(item => ({ title: item.title, body: item.body.slice(0, 300), kind: item.kind }))
  return { tasks, project: context.project ? { name: context.project.name, goal: context.project.goal, nextStep: context.project.nextStep } : undefined, commitments, notes }
}

function providerError(status: number, detail: string) {
  const clean = detail.replace(/https?:\/\/[^\s]+/g, '').trim()
  if (/api key|api_key|key not valid/i.test(clean)) return 'مفتاح Gemini غير صالح. أنشئ مفتاحًا جديدًا من Google AI Studio وتأكد أن Gemini API مفعّل له.'
  if (status === 400) return `Gemini رفض الطلب: ${clean || 'صيغة الطلب غير صالحة.'}`
  if (status === 401 || status === 403) return `مفتاح Gemini غير صالح أو غير مفعّل لهذا المشروع${clean ? `: ${clean}` : '.'}`
  if (status === 404) return `نموذج Gemini غير متاح حاليًا${clean ? `: ${clean}` : '.'}`
  if (status === 402) return 'حساب Gemini يحتاج إلى تفعيل الفوترة أو نفدت أرصدة الدفع المسبق.'
  if (status === 429) return 'وصلت إلى حد استخدام Gemini حاليًا. انتظر قليلًا ثم جرّب مرة أخرى.'
  if (status === 500 || status === 503 || status === 504) return `خدمة Gemini غير مستقرة مؤقتًا (${status}). جرّب مرة أخرى بعد قليل.`
  return `تعذر تشغيل Gemini (${status})${clean ? `: ${clean}` : '.'}`
}

function extractAnswer(response: InteractionResponse) {
  if (response.output_text?.trim()) return response.output_text.trim()
  const text = response.steps?.flatMap(step => step.content ?? [{ type: step.type, text: step.text }]).filter(item => item.type === 'model_output' || item.type === 'text' || item.text).map(item => item.text ?? '').join('').trim()
  return text || ''
}

export async function askGemini(apiKey: string, question: string, context?: AssistantContext) {
  if (!apiKey.trim()) throw new Error('أضف مفتاح Gemini أولًا.')
  if (!navigator.onLine) throw new Error('لا يوجد اتصال بالإنترنت. بياناتك المحلية ما زالت متاحة، لكن Gemini يحتاج إلى اتصال.')
  const prompt = `${question}${context ? `\nالسياق المسموح: ${JSON.stringify(buildContext(context))}` : ''}`
  const payload = {
    model: MODEL,
    input: prompt,
    store: false,
    system_instruction: 'أجب بالعربية المصرية الواضحة. كن هادئًا وعمليًا ولا تلُم المستخدم. لا تخترع بيانات ولا تدّعِ تنفيذ إجراء. لا تحفظ سجل المحادثة ولا تطلب بيانات شخصية إضافية. إذا طلب المستخدم إنشاء أو تعديل مهمة أو ملاحظة أو خطوة مشروع، أعد اقتراحًا واحدًا داخل كتلة JSON فقط بصيغة {"id":"proposal-1","kind":"create_task|update_task|set_task_status|create_note|update_note|add_project_step|update_project_step","targetId":"معرف معروف عند توفره","targetLabel":"اسم السجل","fields":{},"summary":"وصف عربي واضح للتغيير"}. لا تستخدم أي kind آخر ولا تقترح حذفًا.',
    generation_config: { thinking_level: 'low' },
  }
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 120000)
  let response: Response
  try {
    response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() }, body: JSON.stringify(payload), signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('استغرق Gemini أكثر من دقيقتين. قد يكون الطلب بطيئًا أو توجد مشكلة في الشبكة. جرّب سؤالًا أقصر وتأكد من الاتصال.')
    throw new Error(`تعذر الاتصال بـ Gemini: ${error instanceof Error ? error.message : 'تحقق من الإنترنت ومن إعدادات المفتاح.'}`)
  } finally { window.clearTimeout(timeout) }
  const raw = await response.text()
  let body: GeminiErrorBody & InteractionResponse = {}
  try { body = raw ? JSON.parse(raw) as GeminiErrorBody & InteractionResponse : {} } catch { /* provider may return non-JSON */ }
  if (!response.ok) throw new Error(providerError(response.status, body.error?.message ?? ''))
  const answer = extractAnswer(body)
  if (!answer) throw new Error('وصل رد فارغ من Gemini. جرّب صياغة السؤال بطريقة أخرى.')
  return answer
}
