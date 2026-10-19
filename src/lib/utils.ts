import type { Lang } from '@/i18n'

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

const locales: Record<Lang, string> = { en: 'en-US', fr: 'fr-FR' }

export function fmtDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locales[lang], { year: 'numeric', month: 'short', day: '2-digit' }).format(d)
}

export function fmtDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locales[lang], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function fmtNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(locales[lang]).format(n)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string, lang: Lang): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  const d = new Date(Date.UTC(y, m - 1, 1))
  return new Intl.DateTimeFormat(locales[lang], { month: 'short', timeZone: 'UTC' }).format(d)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nextWorkOrderNumber(numbers: string[]): string | null {
  const latest = numbers.reduce((max, number) => {
    const match = /^WO(\d{6})$/.exec(number)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  if (latest >= 999999) return null
  return `WO${String(latest + 1).padStart(6, '0')}`
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.map(escapeCsvCell).join(','))].join('\n')
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Stable id generator for the demo store. */
export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function sortByName<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name))
}
