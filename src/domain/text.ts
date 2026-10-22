export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase('ar-EG')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
}

export function includesSearchText(haystack: string, needle: string) {
  return normalizeSearchText(haystack).includes(normalizeSearchText(needle))
}
