import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type Urgency = 'calm' | 'soon' | 'urgent' | 'overdue'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d)
}

/**
 * Fallback visual de urgência. A fonte da verdade é `urgencyOf` em domain/priority.ts —
 * passe `urgency` para o <Countdown> quando tiver a Task em mãos.
 */
export function urgencyFromDue(due: Date | string, now: Date = new Date()): Urgency {
  const diff = toDate(due).getTime() - now.getTime()
  if (diff < 0) return 'overdue'
  if (diff < 2 * HOUR) return 'urgent'
  if (diff < DAY) return 'soon'
  return 'calm'
}

function hm(ms: number): string {
  const h = Math.floor(ms / HOUR)
  const m = Math.floor((ms % HOUR) / MIN)
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/** Texto curto e sem culpa: "em 2h 15min", "em 3 dias", "passou há 20 min". */
export function formatCountdown(due: Date | string, now: Date = new Date()): string {
  const diff = toDate(due).getTime() - now.getTime()
  const abs = Math.abs(diff)
  if (abs < MIN) return 'vence agora'
  if (diff > 0) {
    if (abs < HOUR) return `em ${Math.floor(abs / MIN)} min`
    if (abs < DAY) return `em ${hm(abs)}`
    const days = Math.round(abs / DAY)
    return days === 1 ? 'em 1 dia' : `em ${days} dias`
  }
  if (abs < HOUR) return `passou há ${Math.floor(abs / MIN)} min`
  if (abs < DAY) return `passou há ${Math.floor(abs / HOUR)}h`
  const days = Math.floor(abs / DAY)
  return days === 1 ? 'passou há 1 dia' : `passou há ${days} dias`
}

/** "sexta, 3 de out. às 15:00" */
export function formatDueFull(due: Date | string): string {
  return format(toDate(due), "EEEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })
}
