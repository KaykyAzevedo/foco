// Gamificação: XP, níveis, sequência com escudo, combo, missão diária e conquistas.
// Tudo puro: recebe o estado e `now`, devolve um novo estado + a recompensa para a UI.
import { addDaysKey, dayKey, daysBetween, MINUTE, toDate, weekKey } from './dates'
import { isOverdue, QUICK_WIN_MIN } from './priority'
import type {
  Achievement,
  ComboState,
  DailyLog,
  DayKey,
  GameState,
  LevelInfo,
  Mission,
  MissionProgress,
  Reward,
  RewardKind,
  StreakState,
  Task,
} from './types'

// ---------------- XP ----------------

export const XP = {
  task: 10,
  urgentMultiplier: 1.5,
  /** concluída antes do prazo E pedido da chefe */
  earlyBossMultiplier: 2,
  step: 2,
  focusSession: 5,
  planDay: 5,
} as const

export interface TaskXp {
  base: number
  multiplier: number
  total: number
  breakdown: string[]
}

/** A tarefa foi concluída (em `at`) antes do prazo? */
export function completedEarly(task: Task, at: Date): boolean {
  return task.due != null && at.getTime() <= toDate(task.due).getTime()
}

/** XP de concluir uma tarefa em `now`, com o combo atual (1 = sem combo). */
export function xpForTask(task: Task, now: Date, combo = 1): TaskXp {
  const breakdown = [`Tarefa +${XP.task}`]
  let multiplier = 1
  if (task.urgent) {
    multiplier *= XP.urgentMultiplier
    breakdown.push(`Urgente ×${XP.urgentMultiplier}`)
  }
  if (task.fromBoss && completedEarly(task, now)) {
    multiplier *= XP.earlyBossMultiplier
    breakdown.push(`Chefe no prazo ×${XP.earlyBossMultiplier}`)
  }
  const cm = comboMultiplier(combo)
  if (cm > 1) {
    multiplier *= cm
    breakdown.push(`Combo ×${cm}`)
  }
  return { base: XP.task, multiplier, total: Math.round(XP.task * multiplier), breakdown }
}

// ---------------- Níveis ----------------

/** XP necessário para ir do nível `level` ao próximo: 50, 75, 100, 125… */
export function xpToNext(level: number): number {
  return 50 + (level - 1) * 25
}

/** XP total acumulado necessário para atingir `level` (nível 1 = 0). */
export function xpForLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += xpToNext(l)
  return total
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1
  let rest = Math.max(0, Math.floor(xp))
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level)
    level++
  }
  const needed = xpToNext(level)
  return { level, current: rest, needed, progress: rest / needed }
}

// ---------------- Combo ----------------

export const COMBO_WINDOW_MS = 30 * MINUTE
const COMBO_STEPS = [1, 1, 1.2, 1.5, 1.75, 2]

/** Multiplicador para a N-ésima conclusão seguida: 1, 1.2, 1.5, 1.75, 2 (teto). */
export function comboMultiplier(count: number): number {
  return COMBO_STEPS[Math.min(Math.max(count, 0), COMBO_STEPS.length - 1)]
}

/** Registra uma conclusão em `now`: soma ao combo se a anterior foi há ≤ 30 min. */
export function nextCombo(combo: ComboState, now: Date): ComboState {
  const alive = combo.lastAt != null && now.getTime() - toDate(combo.lastAt).getTime() <= COMBO_WINDOW_MS
  return { count: alive ? combo.count + 1 : 1, lastAt: now.toISOString() }
}

/** Combo ainda ativo em `now` (0 se expirou). */
export function activeCombo(combo: ComboState, now: Date): number {
  if (!combo.lastAt) return 0
  return now.getTime() - toDate(combo.lastAt).getTime() <= COMBO_WINDOW_MS ? combo.count : 0
}

// ---------------- Sequência (streak) com escudo ----------------

export function emptyStreak(): StreakState {
  return { count: 0, best: 0, shields: 1, shieldedDays: [] }
}

/** Recarrega o escudo (1 por semana ISO). */
export function refillShield(s: StreakState, day: DayKey): StreakState {
  const wk = weekKey(dayKeyToDate(day))
  if (s.shieldWeek === wk) return s
  return { ...s, shields: 1, shieldWeek: wk }
}

function dayKeyToDate(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Registra atividade (≥1 tarefa concluída) em `day`.
 * Dia seguido: +1. Pulou exatamente 1 dia e tem escudo: o escudo salva (+1). Senão recomeça em 1.
 */
export function registerActivity(s0: StreakState, day: DayKey): { streak: StreakState; shieldUsed: boolean } {
  const s = refillShield(s0, day)
  if (s.lastDay === day) return { streak: s, shieldUsed: false }
  const gap = s.lastDay ? daysBetween(s.lastDay, day) : Infinity
  let next: StreakState
  let shieldUsed = false
  if (gap === 1) next = { ...s, count: s.count + 1, lastDay: day }
  else if (gap === 2 && s.shields > 0) {
    shieldUsed = true
    next = {
      ...s,
      count: s.count + 1,
      lastDay: day,
      shields: s.shields - 1,
      shieldedDays: [...s.shieldedDays, addDaysKey(day, -1)].slice(-30),
    }
  } else next = { ...s, count: 1, lastDay: day }
  next.best = Math.max(next.best, next.count)
  return { streak: next, shieldUsed }
}

/** Sequência exibida hoje (0 se já quebrou, considerando o escudo disponível). */
export function currentStreak(s: StreakState, today: DayKey): number {
  if (!s.lastDay) return 0
  const gap = daysBetween(s.lastDay, today)
  if (gap <= 1) return s.count
  if (gap === 2 && refillShield(s, today).shields > 0) return s.count
  return 0
}

/** A sequência depende de concluir algo hoje? */
export function streakAtRisk(s: StreakState, today: DayKey): boolean {
  return currentStreak(s, today) > 0 && s.lastDay !== today
}

/** Escudos disponíveis hoje (já considera a recarga semanal). */
export function shieldsAvailable(s: StreakState, today: DayKey): number {
  return refillShield(s, today).shields
}

// ---------------- Missão diária ----------------

export interface MissionContext {
  tasks: readonly Task[]
  day: DayKey
  focusSessionsToday: number
}

interface MissionDef extends Mission {
  measure(ctx: MissionContext): number
}

const doneToday = (ctx: MissionContext) => ctx.tasks.filter((t) => t.doneAt && dayKey(t.doneAt) === ctx.day)
const hourOf = (iso: string) => toDate(iso).getHours()

export const MISSIONS: readonly MissionDef[] = [
  {
    id: 'boss-before-lunch',
    title: 'Conclua 1 tarefa da chefe antes do almoço',
    target: 1,
    rewardXp: 15,
    measure: (c) => doneToday(c).filter((t) => t.fromBoss && hourOf(t.doneAt!) < 12).length,
  },
  {
    id: 'three-tasks',
    title: 'Conclua 3 tarefas hoje',
    target: 3,
    rewardXp: 15,
    measure: (c) => doneToday(c).length,
  },
  {
    id: 'early-start',
    title: 'Conclua 1 tarefa antes das 10h',
    target: 1,
    rewardXp: 15,
    measure: (c) => doneToday(c).filter((t) => hourOf(t.doneAt!) < 10).length,
  },
  {
    id: 'quick-wins',
    title: 'Conclua 2 tarefas rápidas (até 15 min)',
    target: 2,
    rewardXp: 15,
    measure: (c) =>
      doneToday(c).filter((t) => t.estimateMin != null && t.estimateMin <= QUICK_WIN_MIN).length,
  },
  {
    id: 'focus-session',
    title: 'Complete 1 sessão de foco',
    target: 1,
    rewardXp: 15,
    measure: (c) => c.focusSessionsToday,
  },
  {
    id: 'main-first',
    title: 'Conclua 1 das suas 3 principais',
    target: 1,
    rewardXp: 15,
    measure: (c) => doneToday(c).filter((t) => t.isMain && t.plannedFor === c.day).length,
  },
  {
    id: 'clear-overdue',
    title: 'Resolva 1 tarefa que passou do prazo',
    target: 1,
    rewardXp: 15,
    measure: (c) => doneToday(c).filter((t) => t.due && toDate(t.doneAt!) > toDate(t.due)).length,
  },
]

function hashDay(day: DayKey): number {
  let h = 0
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/** Missão do dia (determinística pelo dia). */
export function missionForDay(day: DayKey): Mission {
  const { measure: _m, ...mission } = MISSIONS[hashDay(day) % MISSIONS.length]
  return mission
}

export function missionProgress(ctx: MissionContext): MissionProgress {
  const def = MISSIONS.find((m) => m.id === missionForDay(ctx.day).id)!
  const { measure, ...mission } = def
  const progress = Math.min(measure(ctx), mission.target)
  return { mission, progress, target: mission.target, done: progress >= mission.target }
}

// ---------------- Conquistas ----------------

export interface AchievementContext {
  tasks: readonly Task[]
  game: GameState
  now: Date
}

interface AchievementDef extends Achievement {
  check(ctx: AchievementContext): boolean
}

const doneTasks = (c: AchievementContext) => c.tasks.filter((t) => t.doneAt)

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-task', title: 'Primeira tarefa', description: 'Concluiu a primeira tarefa.', icon: '🌱', check: (c) => c.game.stats.tasksCompleted >= 1 },
  { id: 'tasks-10', title: 'Pegando o ritmo', description: '10 tarefas concluídas.', icon: '🎯', check: (c) => c.game.stats.tasksCompleted >= 10 },
  { id: 'tasks-50', title: 'Imparável', description: '50 tarefas concluídas.', icon: '🚀', check: (c) => c.game.stats.tasksCompleted >= 50 },
  { id: 'tasks-100', title: 'Centenário', description: '100 tarefas concluídas.', icon: '🏆', check: (c) => c.game.stats.tasksCompleted >= 100 },
  { id: 'boss-10', title: 'Braço direito', description: '10 pedidos da chefe concluídos.', icon: '🤝', check: (c) => c.game.stats.bossCompleted >= 10 },
  {
    id: 'early-bird',
    title: 'Madrugador',
    description: 'Concluiu uma tarefa antes das 8h.',
    icon: '🌅',
    check: (c) => doneTasks(c).some((t) => hourOf(t.doneAt!) < 8 && hourOf(t.doneAt!) >= 4),
  },
  {
    id: 'night-owl',
    title: 'Coruja',
    description: 'Concluiu uma tarefa depois das 22h.',
    icon: '🦉',
    check: (c) => doneTasks(c).some((t) => hourOf(t.doneAt!) >= 22),
  },
  { id: 'streak-3', title: 'Três seguidos', description: 'Sequência de 3 dias.', icon: '🔥', check: (c) => c.game.streak.best >= 3 },
  { id: 'streak-7', title: 'Semana firme', description: 'Sequência de 7 dias.', icon: '📅', check: (c) => c.game.streak.best >= 7 },
  { id: 'streak-30', title: 'Hábito formado', description: 'Sequência de 30 dias.', icon: '💎', check: (c) => c.game.streak.best >= 30 },
  {
    id: 'week-no-overdue',
    title: 'Semana sem atraso',
    description: '5+ prazos cumpridos em 7 dias, todos no prazo.',
    icon: '⏰',
    check: (c) => {
      const since = addDaysKey(dayKey(c.now), -6)
      const withDue = doneTasks(c).filter((t) => t.due && dayKey(t.doneAt!) >= since)
      return (
        withDue.length >= 5 &&
        withDue.every((t) => completedEarly(t, toDate(t.doneAt!))) &&
        !c.tasks.some((t) => isOverdue(t, c.now))
      )
    },
  },
  { id: 'combo-5', title: 'Em chamas', description: 'Combo de 5 tarefas seguidas.', icon: '⚡', check: (c) => c.game.stats.bestCombo >= 5 },
  { id: 'focus-10', title: 'Mente zen', description: '10 sessões de foco completas.', icon: '🧘', check: (c) => c.game.stats.focusSessions >= 10 },
  { id: 'steps-25', title: 'Passo a passo', description: '25 micro-passos concluídos.', icon: '👣', check: (c) => c.game.stats.stepsCompleted >= 25 },
  { id: 'planner-5', title: 'Estrategista', description: 'Planejou o dia 5 vezes.', icon: '🗺️', check: (c) => c.game.stats.daysPlanned >= 5 },
  { id: 'level-5', title: 'Nível 5', description: 'Chegou ao nível 5.', icon: '⭐', check: (c) => levelFromXp(c.game.xp).level >= 5 },
  { id: 'level-10', title: 'Nível 10', description: 'Chegou ao nível 10.', icon: '🌟', check: (c) => levelFromXp(c.game.xp).level >= 10 },
]

function publicAchievement({ check: _c, ...a }: AchievementDef): Achievement {
  return a
}

/** Lista pública (sem as regras) para a tela de conquistas. */
export function allAchievements(): Achievement[] {
  return ACHIEVEMENTS.map(publicAchievement)
}

/** Conquistas que passaram a valer agora e ainda não estavam desbloqueadas. */
export function newAchievements(ctx: AchievementContext): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !ctx.game.achievements[a.id] && a.check(ctx)).map(publicAchievement)
}

// ---------------- Estado e eventos ----------------

export function emptyDailyLog(day: DayKey): DailyLog {
  return { day, focusSessions: 0, missionDone: false, planned: false }
}

export function initialGameState(now: Date): GameState {
  return {
    xp: 0,
    streak: emptyStreak(),
    combo: { count: 0 },
    stats: { tasksCompleted: 0, bossCompleted: 0, stepsCompleted: 0, focusSessions: 0, daysPlanned: 0, bestCombo: 0 },
    today: emptyDailyLog(dayKey(now)),
    achievements: {},
  }
}

/** Garante que o registro diário é do dia de `now`. */
export function rollDay(state: GameState, now: Date): GameState {
  const day = dayKey(now)
  return state.today.day === day ? state : { ...state, today: emptyDailyLog(day) }
}

export interface GameResult {
  state: GameState
  reward: Reward
}

interface Partial0 {
  kind: RewardKind
  xp: number
  breakdown: string[]
  combo?: number
  comboMultiplier?: number
  shieldUsed?: boolean
}

/** Etapa comum: missão, XP, conquistas, nível. */
function finalize(before: GameState, mid: GameState, p: Partial0, tasks: readonly Task[], now: Date): GameResult {
  let state = mid
  let xp = p.xp
  const breakdown = [...p.breakdown]
  let missionCompleted: Mission | undefined
  if (!state.today.missionDone) {
    const mp = missionProgress({ tasks, day: state.today.day, focusSessionsToday: state.today.focusSessions })
    if (mp.done) {
      missionCompleted = mp.mission
      xp += mp.mission.rewardXp
      breakdown.push(`Missão +${mp.mission.rewardXp}`)
      state = { ...state, today: { ...state.today, missionDone: true } }
    }
  }
  state = { ...state, xp: state.xp + xp }
  const unlocked = newAchievements({ tasks, game: state, now })
  if (unlocked.length) {
    const achievements = { ...state.achievements }
    for (const a of unlocked) achievements[a.id] = now.toISOString()
    state = { ...state, achievements }
  }
  const levelBefore = levelFromXp(before.xp).level
  const levelAfter = levelFromXp(state.xp).level
  return {
    state,
    reward: {
      kind: p.kind,
      xp,
      breakdown,
      combo: p.combo ?? activeCombo(state.combo, now),
      comboMultiplier: p.comboMultiplier ?? 1,
      streak: currentStreak(state.streak, state.today.day),
      shieldUsed: p.shieldUsed ?? false,
      levelBefore,
      levelAfter,
      leveledUp: levelAfter > levelBefore,
      missionCompleted,
      unlocked,
      repeat: false,
      at: now.toISOString(),
    },
  }
}

/**
 * Re-conclusão de algo que já rendeu XP (Feito → Desfazer → Feito, ou passo desmarcado e marcado).
 * Estado inalterado; recompensa com xp 0, sem combo, missão ou conquista — a UI ainda mostra "Feito!".
 */
export function repeatReward(state: GameState, kind: RewardKind, now: Date): GameResult {
  const level = levelFromXp(state.xp).level
  return {
    state,
    reward: {
      kind,
      xp: 0,
      breakdown: [],
      combo: 0,
      comboMultiplier: 1,
      streak: currentStreak(state.streak, dayKey(now)),
      shieldUsed: false,
      levelBefore: level,
      levelAfter: level,
      leveledUp: false,
      unlocked: [],
      repeat: true,
      at: now.toISOString(),
    },
  }
}

/**
 * Tarefa concluída. `task` é a tarefa já com `doneAt`; `tasks` é a lista completa já atualizada.
 */
export function onTaskCompleted(state0: GameState, task: Task, tasks: readonly Task[], now: Date): GameResult {
  const before = state0
  let state = rollDay(state0, now)
  const combo = nextCombo(state.combo, now)
  const { streak, shieldUsed } = registerActivity(state.streak, dayKey(now))
  const gain = xpForTask(task, now, combo.count)
  state = {
    ...state,
    combo,
    streak,
    stats: {
      ...state.stats,
      tasksCompleted: state.stats.tasksCompleted + 1,
      bossCompleted: state.stats.bossCompleted + (task.fromBoss ? 1 : 0),
      bestCombo: Math.max(state.stats.bestCombo, combo.count),
    },
  }
  const breakdown = [...gain.breakdown]
  if (shieldUsed) breakdown.push('Escudo salvou sua sequência 🛡️')
  return finalize(
    before,
    state,
    { kind: 'task', xp: gain.total, breakdown, combo: combo.count, comboMultiplier: comboMultiplier(combo.count), shieldUsed },
    tasks,
    now,
  )
}

/** Micro-passo marcado como feito. */
export function onStepCompleted(state0: GameState, tasks: readonly Task[], now: Date): GameResult {
  const state = rollDay(state0, now)
  const mid = { ...state, stats: { ...state.stats, stepsCompleted: state.stats.stepsCompleted + 1 } }
  return finalize(state0, mid, { kind: 'step', xp: XP.step, breakdown: [`Passo +${XP.step}`] }, tasks, now)
}

/** Sessão de foco completa (timer chegou ao fim). */
export function onFocusCompleted(state0: GameState, tasks: readonly Task[], now: Date): GameResult {
  const state = rollDay(state0, now)
  const mid = {
    ...state,
    today: { ...state.today, focusSessions: state.today.focusSessions + 1 },
    stats: { ...state.stats, focusSessions: state.stats.focusSessions + 1 },
  }
  return finalize(state0, mid, { kind: 'focus', xp: XP.focusSession, breakdown: [`Foco +${XP.focusSession}`] }, tasks, now)
}

/** Ritual "Planejar meu dia" concluído (XP só uma vez por dia). */
export function onDayPlanned(state0: GameState, tasks: readonly Task[], now: Date): GameResult {
  const state = rollDay(state0, now)
  if (state.today.planned) return finalize(state0, state, { kind: 'plan', xp: 0, breakdown: [] }, tasks, now)
  const mid = {
    ...state,
    today: { ...state.today, planned: true },
    stats: { ...state.stats, daysPlanned: state.stats.daysPlanned + 1 },
  }
  return finalize(state0, mid, { kind: 'plan', xp: XP.planDay, breakdown: [`Dia planejado +${XP.planDay}`] }, tasks, now)
}
