import { addDays, differenceInCalendarDays, format, getISOWeek, getISOWeekYear, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DayKey } from './types'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Aceita Date ou string ISO. */
export function toDate(d: Date | string): Date {
  return typeof d === 'string' ? parseISO(d) : d
}

export function isValidISO(s: unknown): s is string {
  return typeof s === 'string' && isValid(parseISO(s))
}

/** Dia local 'YYYY-MM-DD'. */
export function dayKey(d: Date | string): DayKey {
  return format(toDate(d), 'yyyy-MM-dd')
}

/** Converte 'YYYY-MM-DD' em Date (00:00 local). */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysKey(key: DayKey, n: number): DayKey {
  return dayKey(addDays(fromDayKey(key), n))
}

/** Diferença em dias de calendário (b - a). */
export function daysBetween(a: DayKey, b: DayKey): number {
  return differenceInCalendarDays(fromDayKey(b), fromDayKey(a))
}

/** Semana ISO 'YYYY-Www'. */
export function weekKey(d: Date | string): string {
  const date = toDate(d)
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`
}

export function atTime(base: Date, hours: number, minutes = 0): Date {
  const d = new Date(base)
  d.setHours(hours, minutes, 0, 0)
  return d
}

export function startOfDayDate(d: Date): Date {
  return atTime(d, 0, 0)
}

export { ptBR }
