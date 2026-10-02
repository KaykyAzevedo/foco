// Algoritmo "qual é a próxima tarefa". Funções puras: sempre recebem `now`.
import { dayKey, HOUR, DAY, addDaysKey, toDate } from './dates'
import type { Task, Urgency } from './types'

export const WEIGHTS = {
  overdue: 100,
  dueUnder2h: 60,
  dueToday: 40,
  dueTomorrow: 20,
  fromBoss: 35,
  urgent: 30,
  isMain: 25,
  plannedToday: 15,
  skippedRecently: -50,
  quickWin: 5,
} as const

/** Tarefa com estimativa até este valor conta como "vitória rápida". */
export const QUICK_WIN_MIN = 15

export function isDone(task: Task): boolean {
  return task.doneAt != null
}

/** Pulada no mesmo dia de `now` ("pular por agora" vale até o fim do dia). */
export function isSkippedToday(task: Task, now: Date): boolean {
  return task.skippedAt != null && dayKey(task.skippedAt) === dayKey(now)
}

export function isPlannedFor(task: Task, now: Date): boolean {
  return task.plannedFor === dayKey(now)
}

/** Milissegundos até o prazo (negativo se atrasada); undefined sem prazo. */
export function msUntilDue(task: Task, now: Date): number | undefined {
  if (!task.due) return undefined
  return toDate(task.due).getTime() - now.getTime()
}

export function isOverdue(task: Task, now: Date): boolean {
  const ms = msUntilDue(task, now)
  return !isDone(task) && ms != null && ms < 0
}

/** Pontuação de prioridade. Concluídas valem -Infinity. */
export function score(task: Task, now: Date): number {
  if (isDone(task)) return -Infinity
  let s = 0
  const ms = msUntilDue(task, now)
  if (ms != null && task.due) {
    const today = dayKey(now)
    const dueDay = dayKey(task.due)
    if (ms < 0) s += WEIGHTS.overdue
    else if (ms < 2 * HOUR) s += WEIGHTS.dueUnder2h
    else if (dueDay === today) s += WEIGHTS.dueToday
    else if (dueDay === addDaysKey(today, 1)) s += WEIGHTS.dueTomorrow
  }
  if (task.fromBoss) s += WEIGHTS.fromBoss
  if (task.urgent) s += WEIGHTS.urgent
  if (isPlannedFor(task, now)) {
    s += WEIGHTS.plannedToday
    if (task.isMain) s += WEIGHTS.isMain
  }
  if (isSkippedToday(task, now)) s += WEIGHTS.skippedRecently
  if (task.estimateMin != null && task.estimateMin <= QUICK_WIN_MIN) s += WEIGHTS.quickWin
  return s
}

/**
 * Comparador de prioridade (para Array.sort): maior prioridade primeiro.
 * Puladas hoje vão sempre para o fim da fila (mais antiga pulada primeiro), para
 * que "Pular por agora" realmente mostre outra coisa.
 * Desempates: prazo mais cedo → ordem manual → criada antes.
 */
export function compareTasks(a: Task, b: Task, now: Date): number {
  const sa = isSkippedToday(a, now)
  const sb = isSkippedToday(b, now)
  if (sa !== sb) return sa ? 1 : -1
  if (sa && sb && a.skippedAt !== b.skippedAt) return a.skippedAt! < b.skippedAt! ? -1 : 1
  const diff = score(b, now) - score(a, now)
  if (diff !== 0 && Number.isFinite(diff)) return diff
  const da = a.due ? toDate(a.due).getTime() : Infinity
  const db = b.due ? toDate(b.due).getTime() : Infinity
  if (da !== db) return da < db ? -1 : 1
  const oa = a.order ?? Infinity
  const ob = b.order ?? Infinity
  if (oa !== ob) return oa < ob ? -1 : 1
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}

/** Tarefas em aberto ordenadas por prioridade (não muta o array). */
export function sortByPriority(tasks: readonly Task[], now: Date): Task[] {
  return tasks.filter((t) => !isDone(t)).sort((a, b) => compareTasks(a, b, now))
}

/** A próxima tarefa (tela "Agora"), ou undefined se não há nada em aberto. */
export function nextTask(tasks: readonly Task[], now: Date): Task | undefined {
  return sortByPriority(tasks, now)[0]
}

/**
 * Nível de urgência para cor/contagem regressiva.
 * overdue: prazo passou · urgent: < 2h · soon: < 24h · calm: resto.
 * Marcada com "!" sobe um degrau (calm → soon, soon → urgent). Sem prazo: calm, ou soon se "!".
 */
export function urgencyOf(task: Task, now: Date): Urgency {
  if (isDone(task)) return 'calm'
  const ms = msUntilDue(task, now)
  let u: Urgency
  if (ms == null) u = 'calm'
  else if (ms < 0) return 'overdue'
  else if (ms < 2 * HOUR) u = 'urgent'
  else if (ms < DAY) u = 'soon'
  else u = 'calm'
  if (task.urgent) u = u === 'calm' ? 'soon' : 'urgent'
  return u
}
