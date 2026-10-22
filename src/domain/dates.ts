export function startOfLocalDay(value = Date.now()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function endOfLocalDay(value = Date.now()) {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

export function isToday(value?: number, reference = Date.now()) {
  return typeof value === 'number' && value >= startOfLocalDay(reference) && value <= endOfLocalDay(reference)
}

export function formatDate(value?: number, withYear = false) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(value)
}

export function formatLongDate(value = Date.now()) {
  return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(value)
}

export function toDateTimeInput(value?: number) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateTimeInput(value: string) {
  if (!value) return undefined
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : undefined
}
