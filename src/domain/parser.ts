// Captura rápida em linguagem natural PT-BR.
//   "relatório vendas amanhã 15h !"   → prazo amanhã 15:00, urgente
//   "ligar fornecedor sexta #chefe"   → prazo próxima sexta 18:00, da chefe
//   "pagar boleto 10/10 ~5m"          → prazo 10/10 18:00, estimativa 5 min
import { addDays } from 'date-fns'
import { atTime, startOfDayDate } from './dates'
import { formatDue, formatEstimate } from './format'
import type { CaptureChip, ParsedCapture } from './types'

export interface ParseOptions {
  /** Hora usada quando só a data é informada (padrão 18h). */
  defaultHour?: number
}

export const DEFAULT_DUE_HOUR = 18

// Preposições/conectores que acompanham datas e horas e devem sumir do título.
const PREP = String.raw`(?:(?:at[ée]|para|pra|na|no|nesta|neste|nessa|nesse|esta|este|essa|esse|dia|em|[àa]s?|pr[óo]xim[ao])\s+)*`
const START = String.raw`(?<=^|[\s,;(])`
const END = String.raw`(?=$|[\s,.;!?)])`

function tokenRe(core: string): RegExp {
  return new RegExp(`${START}${PREP}${core}${END}`, 'iu')
}

const RE_ESTIMATE =
  /(?<=^|\s)~\s*(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|horas?|m|min|mins|minutos?)?(?:\s*(\d{1,2})\s*(?:m|min)?)?(?=$|[\s,.;!?)])/iu
const RE_BOSS = /(?<=^|\s)#chef[ea](?=$|[\s,.;!?)])/iu
const RE_URGENT = /(?<=^|\s)!+|!+(?=\s|$)/gu
const RE_DATE_NUM = tokenRe(String.raw`(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?`)
const RE_DAY_OF_MONTH = tokenRe(String.raw`dia\s+(\d{1,2})`)
const RE_RELATIVE = tokenRe(String.raw`(depois\s+de\s+amanh[ãa]|amanh[ãa]|hoje|hj)`)
const RE_NEXT_WEEK = tokenRe(String.raw`(?:semana\s+que\s+vem|pr[óo]xima\s+semana)`)
const RE_WEEKDAY = tokenRe(String.raw`(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(?:[-\s]feira)?`)
const RE_TIME = tokenRe(
  String.raw`(?:(\d{1,2})(?::(\d{2})|h(?:rs?|s)?(\d{2})?)|(meio[-\s]dia|meia[-\s]noite))(?:\s+(?:da|de)\s+(manh[ãa]|tarde|noite))?`,
)

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
}

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function validDate(y: number, m: number, d: number): Date | undefined {
  const date = new Date(y, m, d)
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : undefined
}

interface Found {
  date?: Date
  time?: { h: number; m: number }
}

export function parseCapture(input: string, now: Date, options: ParseOptions = {}): ParsedCapture {
  const defaultHour = options.defaultHour ?? DEFAULT_DUE_HOUR
  let rest = ` ${input} `
  const chips: CaptureChip[] = []
  const result: ParsedCapture = { title: '', urgent: false, fromBoss: false, chips }
  const today = startOfDayDate(now)
  const found: Found = {}
  const dueRaw: string[] = []

  const cut = (m: RegExpExecArray) => {
    rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length)
  }
  const take = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(rest)
    if (m) cut(m)
    return m
  }

  // Estimativa ~15m, ~1h, ~1h30, ~2 (minutos)
  const est = take(RE_ESTIMATE)
  if (est) {
    const n = Number(est[1].replace(',', '.'))
    const unit = (est[2] ?? 'm').toLowerCase()
    const extra = est[3] ? Number(est[3]) : 0
    const min = unit.startsWith('h') ? Math.round(n * 60 + extra) : Math.round(n)
    if (min > 0) {
      result.estimateMin = min
      chips.push({ kind: 'estimate', label: `~${formatEstimate(min)}`, raw: est[0].trim() })
    }
  }

  // #chefe
  const boss = take(RE_BOSS)
  if (boss) {
    result.fromBoss = true
    chips.push({ kind: 'boss', label: 'Da chefe', raw: boss[0].trim() })
  }

  // ! (urgente) — sozinho, no começo ou no fim de uma palavra
  if (rest.match(RE_URGENT)) {
    rest = rest.replace(RE_URGENT, ' ')
    result.urgent = true
    chips.push({ kind: 'urgent', label: 'Urgente', raw: '!' })
  }

  // Data: dd/mm[/aaaa] → dia N → hoje/amanhã → semana que vem → dia da semana
  const num = RE_DATE_NUM.exec(rest)
  if (num) {
    const d = Number(num[1])
    const m = Number(num[2]) - 1
    let y = num[3] ? Number(num[3]) : today.getFullYear()
    if (num[3] && num[3].length === 2) y += 2000
    let date = validDate(y, m, d)
    if (date && !num[3] && date < today) date = validDate(y + 1, m, d)
    if (date) {
      cut(num)
      found.date = date
      dueRaw.push(num[0].trim())
    }
  }
  if (!found.date) {
    const dm = RE_DAY_OF_MONTH.exec(rest)
    if (dm) {
      const d = Number(dm[1])
      let date: Date | undefined
      for (let i = 0; i < 13 && !date; i++) {
        const base = new Date(today.getFullYear(), today.getMonth() + i, 1)
        const c = validDate(base.getFullYear(), base.getMonth(), d)
        if (c && c >= today) date = c
      }
      if (date) {
        cut(dm)
        found.date = date
        dueRaw.push(dm[0].trim())
      }
    }
  }
  if (!found.date) {
    const rel = take(RE_RELATIVE)
    if (rel) {
      const word = stripAccents(rel[1].toLowerCase()).replace(/\s+/g, ' ')
      const offset = word === 'depois de amanha' ? 2 : word === 'amanha' ? 1 : 0
      found.date = addDays(today, offset)
      dueRaw.push(rel[0].trim())
    }
  }
  if (!found.date) {
    const nw = take(RE_NEXT_WEEK)
    if (nw) {
      const dow = today.getDay()
      const toMonday = ((8 - dow) % 7) || 7
      found.date = addDays(today, toMonday)
      dueRaw.push(nw[0].trim())
    }
  }
  if (!found.date) {
    const wd = take(RE_WEEKDAY)
    if (wd) {
      const target = WEEKDAYS[stripAccents(wd[1].toLowerCase())]
      const diff = ((target - today.getDay() + 7) % 7) || 7 // sempre no futuro
      found.date = addDays(today, diff)
      dueRaw.push(wd[0].trim())
    }
  }

  // Hora: 15h, 15h30, 15:30, às 9h, meio-dia, 3h da tarde
  const tm = RE_TIME.exec(rest)
  if (tm) {
    let h: number
    let m = 0
    if (tm[4]) {
      h = stripAccents(tm[4].toLowerCase()).startsWith('meio') ? 12 : 0
    } else {
      h = Number(tm[1])
      m = Number(tm[2] ?? tm[3] ?? 0)
    }
    const period = tm[5] ? stripAccents(tm[5].toLowerCase()) : undefined
    if ((period === 'tarde' || period === 'noite') && h < 12) h += 12
    if (h <= 23 && m <= 59) {
      cut(tm)
      found.time = { h, m }
      dueRaw.push(tm[0].trim())
    }
  }

  // Resolve prazo
  let due: Date | undefined
  if (found.date && found.time) {
    due = atTime(found.date, found.time.h, found.time.m)
  } else if (found.date) {
    due = atTime(found.date, defaultHour)
    if (due <= now) due = atTime(found.date, 23, 59) // "hoje" à noite: vale até o fim do dia
  } else if (found.time) {
    due = atTime(today, found.time.h, found.time.m)
    if (due <= now) due = addDays(due, 1)
  }
  if (due) {
    result.due = due.toISOString()
    chips.unshift({ kind: 'due', label: formatDue(due, now), raw: dueRaw.join(' ') })
  }

  const title = rest
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '')
    .trim()
  result.title = title || input.trim()
  return result
}
