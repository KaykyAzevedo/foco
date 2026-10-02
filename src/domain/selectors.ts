// Seletores puros para as telas (Hoje, Caixa, resumo da manhã).
import { addDaysKey, dayKey, toDate } from './dates'
import { compareTasks, isDone, isOverdue, sortByPriority } from './priority'
import type { DayKey, Task } from './types'

/** Máximo de tarefas principais por dia. */
export const MAX_MAIN = 3

/**
 * Lista de "Hoje": tarefas em aberto planejadas para `day`.
 * Com ordem manual (`order`) definida, ela manda; as sem ordem vêm depois, por prioridade.
 */
export function todayTasks(tasks: readonly Task[], now: Date, day: DayKey = dayKey(now)): Task[] {
  return tasks
    .filter((t) => !isDone(t) && t.plannedFor === day)
    .sort((a, b) => {
      const oa = a.order ?? Infinity
      const ob = b.order ?? Infinity
      if (oa !== ob) return oa < ob ? -1 : 1
      return compareTasks(a, b, now)
    })
}

/** Tarefas concluídas no dia `day`. */
export function doneOn(tasks: readonly Task[], day: DayKey): Task[] {
  return tasks.filter((t) => t.doneAt != null && dayKey(t.doneAt) === day)
}

export interface DayProgress {
  done: number
  total: number
  /** 0..1 */
  ratio: number
}

/** Progresso do dia: planejadas para o dia + concluídas no dia. */
export function dayProgress(tasks: readonly Task[], day: DayKey): DayProgress {
  const relevant = tasks.filter(
    (t) => t.plannedFor === day || (t.doneAt != null && dayKey(t.doneAt) === day),
  )
  const done = relevant.filter((t) => t.doneAt != null && dayKey(t.doneAt) === day).length
  const total = relevant.length
  return { done, total, ratio: total === 0 ? 0 : done / total }
}

export interface InboxGroups {
  overdue: Task[]
  thisWeek: Task[]
  later: Task[]
  noDate: Task[]
}

/**
 * Caixa: tudo em aberto que não está em "Hoje".
 * Atrasadas · Esta semana (próximos 7 dias) · Depois · Sem data.
 */
export function inboxGroups(tasks: readonly Task[], now: Date): InboxGroups {
  const today = dayKey(now)
  const weekEnd = addDaysKey(today, 6)
  const groups: InboxGroups = { overdue: [], thisWeek: [], later: [], noDate: [] }
  for (const t of sortByPriority(tasks, now)) {
    if (t.plannedFor === today) continue
    if (!t.due) groups.noDate.push(t)
    else if (isOverdue(t, now)) groups.overdue.push(t)
    else if (dayKey(t.due) <= weekEnd) groups.thisWeek.push(t)
    else groups.later.push(t)
  }
  const byDue = (a: Task, b: Task) => toDate(a.due!).getTime() - toDate(b.due!).getTime()
  groups.overdue.sort(byDue)
  groups.thisWeek.sort(byDue)
  groups.later.sort(byDue)
  return groups
}

/**
 * Candidatas para o ritual "Planejar meu dia": em aberto e ainda não planejadas para hoje,
 * por prioridade (as mais relevantes primeiro).
 */
export function planningCandidates(tasks: readonly Task[], now: Date): Task[] {
  const today = dayKey(now)
  return sortByPriority(tasks, now).filter((t) => t.plannedFor !== today)
}

/** O dia já foi planejado? (existe alguma tarefa — aberta ou feita — planejada para hoje) */
export function isDayPlanned(tasks: readonly Task[], now: Date): boolean {
  const today = dayKey(now)
  return tasks.some((t) => t.plannedFor === today)
}

export interface MorningSummary {
  fromBoss: number
  dueToday: number
  overdue: number
  /** primeiro prazo de hoje ainda por vir (ISO) */
  nextDue?: string
  /** frase pronta, ex.: "Hoje você tem 2 da chefe e 1 prazo às 15h." */
  text: string
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

function hourLabel(iso: string): string {
  const d = toDate(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Resumo da manhã ("Hoje você tem 2 da chefe e 1 prazo às 15h."). */
export function morningSummary(tasks: readonly Task[], now: Date): MorningSummary {
  const today = dayKey(now)
  const open = tasks.filter((t) => !isDone(t))
  const relevantToday = open.filter((t) => t.plannedFor === today || (t.due && dayKey(t.due) <= today))
  const fromBoss = relevantToday.filter((t) => t.fromBoss).length
  const overdue = open.filter((t) => isOverdue(t, now)).length
  const dueTodayList = open
    .filter((t) => t.due && dayKey(t.due) === today && !isOverdue(t, now))
    .sort((a, b) => toDate(a.due!).getTime() - toDate(b.due!).getTime())
  const dueToday = dueTodayList.length
  const nextDue = dueTodayList[0]?.due

  const parts: string[] = []
  if (fromBoss) parts.push(plural(fromBoss, 'da chefe', 'da chefe'))
  if (dueToday === 1 && nextDue) parts.push(`1 prazo às ${hourLabel(nextDue)}`)
  else if (dueToday > 1 && nextDue) parts.push(`${dueToday} prazos (o primeiro às ${hourLabel(nextDue)})`)

  let text: string
  if (parts.length === 0 && overdue === 0) text = 'Dia livre de prazos. Que tal escolher 1 coisa importante?'
  else {
    text = parts.length ? `Hoje você tem ${joinPt(parts)}.` : ''
    if (overdue) text += `${text ? ' ' : ''}${plural(overdue, 'tarefa ficou', 'tarefas ficaram')} pra trás — dá pra reagendar com 1 toque.`
  }
  return { fromBoss, dueToday, overdue, nextDue, text }
}

function joinPt(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}
