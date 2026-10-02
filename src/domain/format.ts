// Formatação de prazos em PT-BR (pura, recebe `now`).
import { format } from 'date-fns'
import { addDaysKey, dayKey, daysBetween, DAY, HOUR, MINUTE, ptBR, toDate } from './dates'

function hm(ms: number): string {
  const h = Math.floor(ms / HOUR)
  const m = Math.floor((ms % HOUR) / MINUTE)
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/**
 * Contagem regressiva curta: "em 45 min", "em 2h 10min", "em 3 dias",
 * "agora", "passou há 20 min", "passou há 2 dias" (tom sem culpa).
 */
export function formatCountdown(due: string | Date, now: Date): string {
  const ms = toDate(due).getTime() - now.getTime()
  const abs = Math.abs(ms)
  if (abs < MINUTE) return 'agora'
  let span: string
  if (abs < HOUR) span = `${Math.floor(abs / MINUTE)} min`
  else if (abs < DAY) span = hm(abs)
  else {
    const d = Math.floor(abs / DAY)
    span = `${d} ${d === 1 ? 'dia' : 'dias'}`
  }
  return ms < 0 ? `passou há ${span}` : `em ${span}`
}

/** Horário compacto: "15h", "15h30". */
export function formatHour(d: string | Date): string {
  const date = toDate(d)
  const h = date.getHours()
  const m = date.getMinutes()
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Hora 23:59 é tratada como "fim do dia" (sem horário exibido). */
function isEndOfDay(d: Date) {
  return d.getHours() === 23 && d.getMinutes() === 59
}

/**
 * Rótulo de prazo: "hoje 15h", "amanhã 9h30", "ontem 18h", "sexta 18h", "12/10 18h", "12/10/2027".
 */
export function formatDue(due: string | Date, now: Date): string {
  const d = toDate(due)
  const today = dayKey(now)
  const key = dayKey(d)
  const time = isEndOfDay(d) ? '' : ` ${formatHour(d)}`
  let day: string
  if (key === today) day = 'hoje'
  else if (key === addDaysKey(today, 1)) day = 'amanhã'
  else if (key === addDaysKey(today, -1)) day = 'ontem'
  else {
    const diff = daysBetween(today, key)
    if (diff > 1 && diff < 7) day = format(d, 'EEEE', { locale: ptBR }).replace('-feira', '')
    else if (d.getFullYear() === now.getFullYear()) day = format(d, 'dd/MM')
    else day = format(d, 'dd/MM/yyyy')
  }
  return `${day}${time}`
}

/** Estimativa: "15 min", "1h", "1h 30min". */
export function formatEstimate(min: number): string {
  if (min < 60) return `${min} min`
  return hm(min * MINUTE)
}
