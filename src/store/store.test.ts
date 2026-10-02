import { beforeEach, describe, expect, it } from 'vitest'
import { initialGameState } from '@/domain'
import { NOW, at } from '@/domain/test-utils'
import { useGame } from './useGame'
import { DEFAULT_SETTINGS, useSettings } from './useSettings'
import { useTasks } from './useTasks'

const T = () => useTasks.getState()
const G = () => useGame.getState()

beforeEach(() => {
  localStorage.clear()
  useTasks.setState({ tasks: [] })
  useGame.setState({ ...initialGameState(NOW), lastReward: undefined })
  useSettings.getState().reset()
})

describe('useTasks', () => {
  it('add cria tarefa completa e aceita ParsedCapture', () => {
    const t = T().add({ title: '  ligar  ', urgent: true, steps: ['abrir agenda'] }, NOW)
    expect(t).toMatchObject({ title: 'ligar', urgent: true, fromBoss: false, createdAt: NOW.toISOString() })
    expect(t.steps[0]).toMatchObject({ title: 'abrir agenda', done: false })
    expect(T().tasks).toHaveLength(1)
  })

  it('capture interpreta o texto; vazio é ignorado', () => {
    const t = T().capture('relatório amanhã 15h ! #chefe', NOW)!
    expect(t).toMatchObject({ title: 'relatório', due: at(2026, 10, 3, 15), urgent: true, fromBoss: true })
    expect(T().capture('   ', NOW)).toBeUndefined()
    expect(T().tasks).toHaveLength(1)
  })

  it('complete marca doneAt, limpa skippedAt e devolve recompensa', () => {
    const t = T().add({ title: 'x' }, NOW)
    T().skip(t.id, NOW)
    const reward = T().complete(t.id, NOW)!
    expect(reward.xp).toBeGreaterThanOrEqual(10)
    expect(reward.unlocked.map((a) => a.id)).toContain('first-task')
    const saved = T().tasks[0]
    expect(saved.doneAt).toBe(NOW.toISOString())
    expect(saved.skippedAt).toBeUndefined()
    expect(G().xp).toBe(reward.xp)
    expect(G().lastReward).toEqual(reward)
  })

  it('complete de tarefa inexistente ou já feita → undefined, sem XP duplo', () => {
    const t = T().add({ title: 'x' }, NOW)
    T().complete(t.id, NOW)
    const xp = G().xp
    expect(T().complete(t.id, NOW)).toBeUndefined()
    expect(T().complete('nope', NOW)).toBeUndefined()
    expect(G().xp).toBe(xp)
  })

  it('uncomplete desfaz sem tirar XP', () => {
    const t = T().add({ title: 'x' }, NOW)
    T().complete(t.id, NOW)
    const xp = G().xp
    T().uncomplete(t.id)
    expect(T().tasks[0].doneAt).toBeUndefined()
    expect(G().xp).toBe(xp)
  })

  it('regressão (Sentinela): Feito → Desfazer em loop não farma XP nem combo', () => {
    const t = T().add({ title: 'B' }, NOW)
    const first = T().completeTask(t.id, NOW)!
    expect(first.repeat).toBe(false)
    const xpAfterFirst = G().xp
    const statsAfterFirst = G().stats
    for (let i = 1; i <= 5; i++) {
      T().uncomplete(t.id)
      const r = T().completeTask(t.id, new Date(NOW.getTime() + i * 60_000))!
      expect(r).toMatchObject({ kind: 'task', xp: 0, repeat: true, combo: 0, leveledUp: false, unlocked: [] })
      expect(r.missionCompleted).toBeUndefined()
      expect(G().lastReward).toEqual(r) // a UI ainda recebe feedback
    }
    expect(G().xp).toBe(xpAfterFirst)
    expect(G().combo.count).toBe(1)
    expect(G().stats).toEqual(statsAfterFirst)
    expect(T().tasks[0].doneAt).toBeDefined()
    expect(T().tasks[0].rewardedAt).toBe(NOW.toISOString())
  })

  it('regressão (Sentinela): desmarcar e marcar o passo de novo não paga 2 XP de novo', () => {
    const t = T().add({ title: 'x', steps: ['a'] }, NOW)
    const stepId = T().tasks[0].steps[0].id
    const first = T().toggleStep(t.id, stepId, NOW)!
    expect(first.xp).toBeGreaterThanOrEqual(2)
    const xp = G().xp
    for (let i = 0; i < 5; i++) {
      expect(T().toggleStep(t.id, stepId, NOW)).toBeUndefined() // desmarca
      const r = T().completeStep(t.id, stepId, NOW)!
      expect(r).toMatchObject({ kind: 'step', xp: 0, repeat: true })
    }
    expect(G().xp).toBe(xp)
    expect(G().stats.stepsCompleted).toBe(1)
  })

  it('tarefas diferentes continuam pagando normalmente', () => {
    const a = T().add({ title: 'a' }, NOW)
    const b = T().add({ title: 'b' }, NOW)
    T().complete(a.id, NOW)
    const r = T().complete(b.id, new Date(NOW.getTime() + 60_000))!
    expect(r.repeat).toBe(false)
    expect(r.xp).toBeGreaterThan(0)
    expect(G().stats.tasksCompleted).toBe(2)
  })

  it('skip registra skippedAt; reschedule troca prazo e limpa skip', () => {
    const t = T().add({ title: 'x' }, NOW)
    T().skip(t.id, NOW)
    expect(T().tasks[0].skippedAt).toBe(NOW.toISOString())
    T().reschedule(t.id, at(2026, 10, 5, 9))
    expect(T().tasks[0]).toMatchObject({ due: at(2026, 10, 5, 9), skippedAt: undefined })
    T().reschedule(t.id, undefined)
    expect(T().tasks[0].due).toBeUndefined()
  })

  it('update aplica patch', () => {
    const t = T().add({ title: 'x' }, NOW)
    T().update(t.id, { title: 'y', fromBoss: true, notes: 'n' })
    expect(T().tasks[0]).toMatchObject({ id: t.id, title: 'y', fromBoss: true, notes: 'n' })
  })

  it('plan: até 3 principais, extras, ordem e substitui o plano anterior', () => {
    const ids = Array.from({ length: 6 }, (_, i) => T().add({ title: `t${i}` }, NOW).id)
    T().plan({ main: [ids[0]], extra: [ids[5]] }, NOW)
    const reward = T().plan({ main: [ids[1], ids[2], ids[3], ids[4]], extra: [ids[0], ids[1]] }, NOW)
    const byId = Object.fromEntries(T().tasks.map((t) => [t.id, t]))
    expect([1, 2, 3].map((i) => byId[ids[i]].isMain)).toEqual([true, true, true])
    expect(byId[ids[4]].plannedFor).toBeUndefined() // 4ª principal ignorada
    expect(byId[ids[0]]).toMatchObject({ plannedFor: '2026-10-02', isMain: false, order: 3 })
    expect(byId[ids[5]].plannedFor).toBeUndefined() // saiu do plano
    expect(reward.kind).toBe('plan')
    expect(G().stats.daysPlanned).toBe(1)
  })

  it('aliases das telas apontam para as mesmas ações', () => {
    const t = T().addTask({ title: 'x' }, NOW)
    T().planToday([t.id], [], NOW)
    expect(T().tasks[0].isMain).toBe(true)
    T().updateTask(t.id, { title: 'z' })
    T().skipTask(t.id, NOW)
    T().rescheduleTask(t.id, at(2026, 10, 3))
    T().reorderToday([t.id])
    expect(T().completeTask(t.id, NOW)?.kind).toBe('task')
  })

  it('addToToday / removeFromToday', () => {
    const a = T().add({ title: 'a' }, NOW)
    const b = T().add({ title: 'b' }, NOW)
    T().addToToday(a.id, NOW, true)
    T().addToToday(b.id, NOW)
    expect(T().tasks.map((t) => [t.plannedFor, t.isMain, t.order])).toEqual([
      ['2026-10-02', true, 0],
      ['2026-10-02', false, 1],
    ])
    T().removeFromToday(a.id)
    expect(T().tasks[0].plannedFor).toBeUndefined()
  })

  it('reorder define order pela posição', () => {
    const a = T().add({ title: 'a' }, NOW)
    const b = T().add({ title: 'b' }, NOW)
    T().reorder([b.id, a.id])
    expect(T().tasks.map((t) => t.order)).toEqual([1, 0])
  })

  it('passos: add, toggle (XP só ao marcar), update, remove', () => {
    const t = T().add({ title: 'x' }, NOW)
    const step = T().addStep(t.id, ' abrir ')!
    expect(step.title).toBe('abrir')
    expect(T().addStep(t.id, '  ')).toBeUndefined()
    const r = T().toggleStep(t.id, step.id, NOW)!
    expect(r.kind).toBe('step')
    expect(G().stats.stepsCompleted).toBe(1)
    expect(T().toggleStep(t.id, step.id, NOW)).toBeUndefined()
    expect(T().tasks[0].steps[0].done).toBe(false)
    expect(T().completeStep(t.id, step.id, NOW)?.kind).toBe('step')
    T().updateStep(t.id, step.id, 'novo')
    expect(T().tasks[0].steps[0].title).toBe('novo')
    T().removeStep(t.id, step.id)
    expect(T().tasks[0].steps).toEqual([])
  })

  it('restore reinsere a tarefa apagada com o mesmo id; no-op se já existe', () => {
    const t = T().add({ title: 'x', steps: ['a'] }, NOW)
    const other = T().add({ title: 'y' }, NOW)
    T().remove(t.id)
    T().restore(t)
    expect(T().tasks.find((x) => x.id === t.id)).toEqual(t)
    expect(T().tasks).toHaveLength(2)
    T().restore({ ...t, title: 'duplicada' })
    expect(T().tasks).toHaveLength(2)
    expect(T().tasks.find((x) => x.id === t.id)?.title).toBe('x')
    expect(T().tasks.find((x) => x.id === other.id)).toBeDefined()
  })

  it('remove e replaceAll', () => {
    const t = T().add({ title: 'x' }, NOW)
    T().remove(t.id)
    expect(T().tasks).toEqual([])
    T().replaceAll([{ ...t, title: 'importada' }])
    expect(T().tasks[0].title).toBe('importada')
  })

  it('persiste no localStorage', () => {
    T().add({ title: 'persistida' }, NOW)
    const raw = JSON.parse(localStorage.getItem('foco:tasks')!)
    expect(raw.state.tasks[0].title).toBe('persistida')
    expect(raw.version).toBe(1)
  })
})

describe('useGame', () => {
  it('focusCompleted soma sessão e XP', () => {
    const r = G().focusCompleted(NOW)
    expect(r.kind).toBe('focus')
    expect(G().stats.focusSessions).toBe(1)
    expect(G().xp).toBe(r.xp)
  })

  it('clearReward, touchDay, reset', () => {
    G().focusCompleted(NOW)
    G().clearReward()
    expect(G().lastReward).toBeUndefined()
    G().touchDay(new Date(2026, 9, 3, 8))
    expect(G().today.day).toBe('2026-10-03')
    G().reset()
    expect(G().xp).toBe(0)
  })

  it('persiste só os dados (sem lastReward/ações)', () => {
    G().focusCompleted(NOW)
    const raw = JSON.parse(localStorage.getItem('foco:game')!)
    expect(raw.state).not.toHaveProperty('lastReward')
    expect(raw.state.stats.focusSessions).toBe(1)
  })
})

describe('useSettings', () => {
  it('padrões e setters', () => {
    expect(useSettings.getState()).toMatchObject(DEFAULT_SETTINGS)
    const s = useSettings.getState()
    s.setTheme('dark')
    s.setSound(true)
    s.setNotifications(true)
    s.setFocusMinutes(45)
    s.markMorningSummary('2026-10-02')
    expect(useSettings.getState()).toMatchObject({
      theme: 'dark',
      sound: true,
      notifications: true,
      focusMinutes: 45,
      lastMorningSummary: '2026-10-02',
    })
    expect(JSON.parse(localStorage.getItem('foco:settings')!).state.theme).toBe('dark')
  })
})
