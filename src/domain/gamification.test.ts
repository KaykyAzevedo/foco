import { describe, expect, it } from 'vitest'
import {
  activeCombo,
  allAchievements,
  comboMultiplier,
  currentStreak,
  emptyStreak,
  initialGameState,
  levelFromXp,
  missionForDay,
  missionProgress,
  MISSIONS,
  newAchievements,
  nextCombo,
  onDayPlanned,
  onFocusCompleted,
  onStepCompleted,
  onTaskCompleted,
  registerActivity,
  shieldsAvailable,
  streakAtRisk,
  XP,
  xpForLevel,
  xpForTask,
  xpToNext,
} from './gamification'
import { at, makeTask, NOW } from './test-utils'
import type { GameState, StreakState, Task } from './types'

const min = (n: number) => new Date(NOW.getTime() + n * 60_000)

describe('xpForTask', () => {
  it('base 10', () => {
    expect(xpForTask(makeTask(), NOW).total).toBe(10)
  })
  it('urgente ×1.5', () => {
    expect(xpForTask(makeTask({ urgent: true }), NOW).total).toBe(15)
  })
  it('chefe antes do prazo ×2; chefe atrasada não', () => {
    expect(xpForTask(makeTask({ fromBoss: true, due: at(2026, 10, 2, 18) }), NOW).total).toBe(20)
    expect(xpForTask(makeTask({ fromBoss: true, due: at(2026, 10, 2, 9) }), NOW).total).toBe(10)
    expect(xpForTask(makeTask({ fromBoss: true }), NOW).total).toBe(10)
  })
  it('antes do prazo sem ser da chefe não dobra', () => {
    expect(xpForTask(makeTask({ due: at(2026, 10, 2, 18) }), NOW).total).toBe(10)
  })
  it('acumula urgente + chefe + combo', () => {
    const r = xpForTask(makeTask({ urgent: true, fromBoss: true, due: at(2026, 10, 3) }), NOW, 3)
    expect(r.multiplier).toBeCloseTo(1.5 * 2 * 1.5)
    expect(r.total).toBe(45)
    expect(r.breakdown).toEqual(['Tarefa +10', 'Urgente ×1.5', 'Chefe no prazo ×2', 'Combo ×1.5'])
  })
})

describe('níveis', () => {
  it('curva suave 50, 75, 100…', () => {
    expect(xpToNext(1)).toBe(50)
    expect(xpToNext(2)).toBe(75)
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(3)).toBe(125)
  })
  it('levelFromXp', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, current: 0, needed: 50, progress: 0 })
    expect(levelFromXp(49).level).toBe(1)
    expect(levelFromXp(50)).toEqual({ level: 2, current: 0, needed: 75, progress: 0 })
    expect(levelFromXp(125 + 50).progress).toBeCloseTo(0.5)
    expect(levelFromXp(-10).level).toBe(1)
  })
  it('xpForLevel e levelFromXp são inversos', () => {
    for (let l = 1; l < 30; l++) expect(levelFromXp(xpForLevel(l)).level).toBe(l)
  })
})

describe('combo', () => {
  it('multiplicadores', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(comboMultiplier)).toEqual([1, 1, 1.2, 1.5, 1.75, 2, 2])
  })
  it('soma dentro de 30 min e reinicia depois', () => {
    let c = nextCombo({ count: 0 }, NOW)
    expect(c.count).toBe(1)
    c = nextCombo(c, min(30))
    expect(c.count).toBe(2)
    c = nextCombo(c, min(61))
    expect(c.count).toBe(1)
  })
  it('activeCombo expira', () => {
    const c = { count: 3, lastAt: NOW.toISOString() }
    expect(activeCombo(c, min(10))).toBe(3)
    expect(activeCombo(c, min(31))).toBe(0)
    expect(activeCombo({ count: 0 }, NOW)).toBe(0)
  })
})

describe('streak com escudo', () => {
  const s = (p: Partial<StreakState>): StreakState => ({ ...emptyStreak(), ...p })

  it('primeiro dia = 1', () => {
    expect(registerActivity(emptyStreak(), '2026-10-02').streak.count).toBe(1)
  })
  it('mesmo dia não soma', () => {
    const r = registerActivity(s({ count: 4, lastDay: '2026-10-02' }), '2026-10-02')
    expect(r.streak.count).toBe(4)
  })
  it('dia seguinte soma e atualiza best', () => {
    const r = registerActivity(s({ count: 4, best: 4, lastDay: '2026-10-01' }), '2026-10-02')
    expect(r.streak.count).toBe(5)
    expect(r.streak.best).toBe(5)
  })
  it('pulou 1 dia com escudo: salva e gasta o escudo', () => {
    const r = registerActivity(s({ count: 4, lastDay: '2026-09-30', shields: 1, shieldWeek: '2026-W40' }), '2026-10-02')
    expect(r.shieldUsed).toBe(true)
    expect(r.streak.count).toBe(5)
    expect(r.streak.shields).toBe(0)
    expect(r.streak.shieldedDays).toEqual(['2026-10-01'])
  })
  it('pulou 1 dia sem escudo (mesma semana): recomeça', () => {
    const r = registerActivity(s({ count: 4, best: 4, lastDay: '2026-09-30', shields: 0, shieldWeek: '2026-W40' }), '2026-10-02')
    expect(r.shieldUsed).toBe(false)
    expect(r.streak.count).toBe(1)
    expect(r.streak.best).toBe(4)
  })
  it('escudo recarrega na semana nova', () => {
    const st = s({ count: 4, lastDay: '2026-10-03', shields: 0, shieldWeek: '2026-W40' })
    expect(shieldsAvailable(st, '2026-10-05')).toBe(1)
    const r = registerActivity(st, '2026-10-05') // pulou domingo 04, segunda é semana nova
    expect(r.shieldUsed).toBe(true)
    expect(r.streak.count).toBe(5)
  })
  it('pulou 2+ dias: recomeça mesmo com escudo', () => {
    const r = registerActivity(s({ count: 9, lastDay: '2026-09-29', shields: 1, shieldWeek: '2026-W40' }), '2026-10-02')
    expect(r.streak.count).toBe(1)
  })
  it('currentStreak e streakAtRisk', () => {
    const st = s({ count: 3, lastDay: '2026-10-01', shields: 0, shieldWeek: '2026-W40' })
    expect(currentStreak(st, '2026-10-01')).toBe(3)
    expect(currentStreak(st, '2026-10-02')).toBe(3)
    expect(streakAtRisk(st, '2026-10-02')).toBe(true)
    expect(streakAtRisk(st, '2026-10-01')).toBe(false)
    expect(currentStreak(st, '2026-10-03')).toBe(0)
    expect(currentStreak({ ...st, shields: 1 }, '2026-10-03')).toBe(3)
    expect(currentStreak(emptyStreak(), '2026-10-03')).toBe(0)
  })
})

describe('missão diária', () => {
  it('é determinística por dia e cobre várias missões', () => {
    expect(missionForDay('2026-10-02')).toEqual(missionForDay('2026-10-02'))
    const ids = new Set(Array.from({ length: 30 }, (_, i) => missionForDay(`2026-10-${String(i + 1).padStart(2, '0')}`).id))
    expect(ids.size).toBeGreaterThan(3)
  })

  it('cada missão mede corretamente', () => {
    const day = '2026-10-02'
    const done = (p: Partial<Task>) => makeTask({ doneAt: at(2026, 10, 2, 9), ...p })
    const tasks: Task[] = [
      done({ fromBoss: true }),
      done({ estimateMin: 10 }),
      done({ estimateMin: 5, isMain: true, plannedFor: day, due: at(2026, 10, 1) }),
      makeTask({ doneAt: at(2026, 10, 1, 9) }), // ontem: não conta
    ]
    const ctx = { tasks, day, focusSessionsToday: 1 }
    const measured = Object.fromEntries(MISSIONS.map((m) => [m.id, m.measure(ctx)]))
    expect(measured).toEqual({
      'boss-before-lunch': 1,
      'three-tasks': 3,
      'early-start': 3,
      'quick-wins': 2,
      'focus-session': 1,
      'main-first': 1,
      'clear-overdue': 1,
    })
  })

  it('missionProgress limita ao alvo', () => {
    const day = '2026-10-02'
    const tasks = Array.from({ length: 5 }, () => makeTask({ doneAt: at(2026, 10, 2, 9), fromBoss: true, estimateMin: 5 }))
    const mp = missionProgress({ tasks, day, focusSessionsToday: 9 })
    expect(mp.progress).toBe(mp.target)
    expect(mp.done).toBe(true)
  })
})

describe('conquistas', () => {
  it('lista pública sem regras', () => {
    const list = allAchievements()
    expect(list.length).toBeGreaterThan(10)
    expect(list[0]).not.toHaveProperty('check')
    expect(new Set(list.map((a) => a.id)).size).toBe(list.length)
  })

  it('não repete conquista já desbloqueada', () => {
    const game: GameState = { ...initialGameState(NOW), stats: { ...initialGameState(NOW).stats, tasksCompleted: 1 } }
    expect(newAchievements({ tasks: [], game, now: NOW }).map((a) => a.id)).toContain('first-task')
    game.achievements['first-task'] = NOW.toISOString()
    expect(newAchievements({ tasks: [], game, now: NOW }).map((a) => a.id)).not.toContain('first-task')
  })

  it('madrugador e coruja', () => {
    const game = initialGameState(NOW)
    const ids = (tasks: Task[]) => newAchievements({ tasks, game, now: NOW }).map((a) => a.id)
    expect(ids([makeTask({ doneAt: at(2026, 10, 2, 6) })])).toContain('early-bird')
    expect(ids([makeTask({ doneAt: at(2026, 10, 2, 23) })])).toContain('night-owl')
    expect(ids([makeTask({ doneAt: at(2026, 10, 2, 12) })])).toEqual([])
  })

  it('semana sem atraso', () => {
    const game = initialGameState(NOW)
    const onTime = Array.from({ length: 5 }, (_, i) =>
      makeTask({ due: at(2026, 9, 28 + i, 18), doneAt: at(2026, 9, 28 + i, 12) }),
    )
    const ids = (tasks: Task[]) => newAchievements({ tasks, game, now: NOW }).map((a) => a.id)
    expect(ids(onTime)).toContain('week-no-overdue')
    expect(ids(onTime.slice(0, 4))).not.toContain('week-no-overdue')
    expect(ids([...onTime, makeTask({ due: at(2026, 10, 1) })])).not.toContain('week-no-overdue')
    const late = [...onTime.slice(1), makeTask({ due: at(2026, 9, 30, 9), doneAt: at(2026, 9, 30, 12) })]
    expect(ids(late)).not.toContain('week-no-overdue')
  })
})

describe('eventos', () => {
  it('onTaskCompleted: XP, stats, streak, combo, primeira conquista', () => {
    const s0 = initialGameState(NOW)
    const task = makeTask({ doneAt: NOW.toISOString(), fromBoss: true })
    const { state, reward } = onTaskCompleted(s0, task, [task], NOW)
    expect(reward.kind).toBe('task')
    expect(state.stats.tasksCompleted).toBe(1)
    expect(state.stats.bossCompleted).toBe(1)
    expect(state.streak.count).toBe(1)
    expect(state.combo.count).toBe(1)
    expect(reward.unlocked.map((a) => a.id)).toContain('first-task')
    expect(state.achievements['first-task']).toBe(NOW.toISOString())
    expect(state.xp).toBe(reward.xp)
    expect(s0.xp).toBe(0) // imutável
  })

  it('combo cresce e entra no XP', () => {
    let state = initialGameState(NOW)
    const xps: number[] = []
    for (let i = 0; i < 3; i++) {
      const now = min(i * 10)
      const t = makeTask({ doneAt: now.toISOString() })
      const r = onTaskCompleted(state, t, [t], now)
      state = r.state
      xps.push(r.reward.comboMultiplier)
    }
    expect(xps).toEqual([1, 1.2, 1.5])
    expect(state.stats.bestCombo).toBe(3)
  })

  it('missão completada dá bônus uma vez só', () => {
    const day = '2026-10-02'
    const mission = missionForDay(day)
    expect(mission.id).toBeTruthy()
    // força a missão "focus-session" usando um dia onde ela cai
    const focusDay = Array.from({ length: 60 }, (_, i) => new Date(2026, 9, 1 + i)).find(
      (d) => missionForDay(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`).id === 'focus-session',
    )!
    focusDay.setHours(10)
    const r1 = onFocusCompleted(initialGameState(focusDay), [], focusDay)
    expect(r1.reward.missionCompleted?.id).toBe('focus-session')
    expect(r1.reward.xp).toBe(XP.focusSession + 15)
    const r2 = onFocusCompleted(r1.state, [], focusDay)
    expect(r2.reward.missionCompleted).toBeUndefined()
    expect(r2.reward.xp).toBe(XP.focusSession)
    expect(r2.state.stats.focusSessions).toBe(2)
  })

  it('subir de nível é sinalizado', () => {
    const s0 = { ...initialGameState(NOW), xp: 48 }
    const { reward } = onStepCompleted(s0, [], NOW)
    expect(reward.levelBefore).toBe(1)
    expect(reward.levelAfter).toBe(2)
    expect(reward.leveledUp).toBe(true)
  })

  it('planejar o dia: XP só na primeira vez do dia', () => {
    const r1 = onDayPlanned(initialGameState(NOW), [], NOW)
    expect(r1.reward.xp).toBeGreaterThanOrEqual(XP.planDay)
    expect(r1.state.stats.daysPlanned).toBe(1)
    const r2 = onDayPlanned(r1.state, [], min(5))
    expect(r2.reward.xp).toBe(0)
    expect(r2.state.stats.daysPlanned).toBe(1)
    const r3 = onDayPlanned(r2.state, [], new Date(2026, 9, 3, 9))
    expect(r3.state.stats.daysPlanned).toBe(2)
  })

  it('virada de dia zera o registro diário', () => {
    const r1 = onFocusCompleted(initialGameState(NOW), [], NOW)
    expect(r1.state.today.focusSessions).toBe(1)
    const tomorrow = new Date(2026, 9, 3, 9)
    const r2 = onStepCompleted(r1.state, [], tomorrow)
    expect(r2.state.today).toMatchObject({ day: '2026-10-03', focusSessions: 0 })
  })
})
