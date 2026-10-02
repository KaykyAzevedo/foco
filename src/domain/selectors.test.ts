import { describe, expect, it } from 'vitest'
import { formatCountdown, formatDue, formatEstimate, formatHour } from './format'
import {
  dayProgress,
  doneOn,
  inboxGroups,
  isDayPlanned,
  morningSummary,
  planningCandidates,
  todayTasks,
} from './selectors'
import { at, makeTask, NOW } from './test-utils'

const TODAY = '2026-10-02'

describe('todayTasks', () => {
  it('só abertas planejadas para hoje; ordem manual primeiro', () => {
    const a = makeTask({ title: 'a', plannedFor: TODAY, order: 1 })
    const b = makeTask({ title: 'b', plannedFor: TODAY, order: 0 })
    const c = makeTask({ title: 'c', plannedFor: TODAY, fromBoss: true })
    const d = makeTask({ title: 'd', plannedFor: TODAY, doneAt: at(2026, 10, 2, 9) })
    const e = makeTask({ title: 'e', plannedFor: '2026-10-01' })
    const f = makeTask({ title: 'f' })
    expect(todayTasks([a, b, c, d, e, f], NOW).map((t) => t.title)).toEqual(['b', 'a', 'c'])
  })

  it('sem ordem manual: por prioridade', () => {
    const a = makeTask({ title: 'a', plannedFor: TODAY })
    const b = makeTask({ title: 'b', plannedFor: TODAY, urgent: true })
    expect(todayTasks([a, b], NOW).map((t) => t.title)).toEqual(['b', 'a'])
  })
})

describe('dayProgress / doneOn', () => {
  it('conta planejadas + concluídas no dia', () => {
    const tasks = [
      makeTask({ plannedFor: TODAY }),
      makeTask({ plannedFor: TODAY, doneAt: at(2026, 10, 2, 9) }),
      makeTask({ doneAt: at(2026, 10, 2, 8) }), // feita fora do plano
      makeTask({ doneAt: at(2026, 10, 1, 8) }), // ontem
    ]
    expect(dayProgress(tasks, TODAY)).toEqual({ done: 2, total: 3, ratio: 2 / 3 })
    expect(doneOn(tasks, TODAY)).toHaveLength(2)
    expect(dayProgress([], TODAY).ratio).toBe(0)
  })
})

describe('inboxGroups', () => {
  it('agrupa e exclui Hoje e concluídas', () => {
    const tasks = [
      makeTask({ title: 'atrasada', due: at(2026, 10, 1, 18) }),
      makeTask({ title: 'hoje-tarde', due: at(2026, 10, 2, 18) }),
      makeTask({ title: 'quinta', due: at(2026, 10, 8, 18) }),
      makeTask({ title: 'sexta-que-vem', due: at(2026, 10, 9, 18) }),
      makeTask({ title: 'sem-data' }),
      makeTask({ title: 'planejada', plannedFor: TODAY, due: at(2026, 10, 1) }),
      makeTask({ title: 'feita', doneAt: at(2026, 10, 1) }),
    ]
    const g = inboxGroups(tasks, NOW)
    const titles = (l: typeof g.overdue) => l.map((t) => t.title)
    expect(titles(g.overdue)).toEqual(['atrasada'])
    expect(titles(g.thisWeek)).toEqual(['hoje-tarde', 'quinta'])
    expect(titles(g.later)).toEqual(['sexta-que-vem'])
    expect(titles(g.noDate)).toEqual(['sem-data'])
  })

  it('planejada para dia passado e não feita volta para a Caixa', () => {
    const t = makeTask({ title: 'sobrou', plannedFor: '2026-10-01' })
    expect(inboxGroups([t], NOW).noDate).toHaveLength(1)
  })

  it('grupos datados ordenados por prazo', () => {
    const tasks = [
      makeTask({ title: 'b', due: at(2026, 10, 5) }),
      makeTask({ title: 'a', due: at(2026, 10, 4), fromBoss: false }),
      makeTask({ title: 'c', due: at(2026, 10, 6), fromBoss: true }),
    ]
    expect(inboxGroups(tasks, NOW).thisWeek.map((t) => t.title)).toEqual(['a', 'b', 'c'])
  })
})

describe('planejamento', () => {
  it('candidatas excluem as já planejadas hoje e vêm por prioridade', () => {
    const tasks = [
      makeTask({ title: 'x' }),
      makeTask({ title: 'boss', fromBoss: true }),
      makeTask({ title: 'hoje', plannedFor: TODAY }),
    ]
    expect(planningCandidates(tasks, NOW).map((t) => t.title)).toEqual(['boss', 'x'])
    expect(isDayPlanned(tasks, NOW)).toBe(true)
    expect(isDayPlanned(tasks.slice(0, 2), NOW)).toBe(false)
  })
})

describe('morningSummary', () => {
  it('"Hoje você tem 2 da chefe e 1 prazo às 15h."', () => {
    const tasks = [
      makeTask({ fromBoss: true, plannedFor: TODAY }),
      makeTask({ fromBoss: true, due: at(2026, 10, 2, 15) }),
    ]
    const s = morningSummary(tasks, NOW)
    expect(s.text).toBe('Hoje você tem 2 da chefe e 1 prazo às 15h.')
    expect(s.nextDue).toBe(at(2026, 10, 2, 15))
  })

  it('vários prazos e atrasadas', () => {
    const tasks = [
      makeTask({ due: at(2026, 10, 2, 11, 30) }),
      makeTask({ due: at(2026, 10, 2, 17) }),
      makeTask({ due: at(2026, 10, 1, 17) }),
    ]
    expect(morningSummary(tasks, NOW).text).toBe(
      'Hoje você tem 2 prazos (o primeiro às 11h30). 1 tarefa passou do prazo — dá pra reagendar com 1 toque.',
    )
  })

  it('dia livre', () => {
    expect(morningSummary([makeTask()], NOW).text).toMatch(/Dia livre/)
  })

  it('só atrasadas', () => {
    const tasks = [makeTask({ due: at(2026, 9, 30) }), makeTask({ due: at(2026, 9, 29) })]
    expect(morningSummary(tasks, NOW).text).toBe('2 tarefas passaram do prazo — dá pra reagendar com 1 toque.')
  })
})

describe('format', () => {
  it('formatCountdown', () => {
    expect(formatCountdown(at(2026, 10, 2, 10, 45), NOW)).toBe('em 45 min')
    expect(formatCountdown(at(2026, 10, 2, 12, 10), NOW)).toBe('em 2h 10min')
    expect(formatCountdown(at(2026, 10, 2, 13), NOW)).toBe('em 3h')
    expect(formatCountdown(at(2026, 10, 5, 10), NOW)).toBe('em 3 dias')
    expect(formatCountdown(at(2026, 10, 3, 11), NOW)).toBe('em 1 dia')
    expect(formatCountdown(NOW, NOW)).toBe('agora')
    expect(formatCountdown(at(2026, 10, 2, 9, 40), NOW)).toBe('passou há 20 min')
    expect(formatCountdown(at(2026, 9, 30, 9), NOW)).toBe('passou há 2 dias')
  })

  it('formatDue', () => {
    expect(formatDue(at(2026, 10, 2, 15), NOW)).toBe('hoje 15h')
    expect(formatDue(at(2026, 10, 3, 9, 30), NOW)).toBe('amanhã 9h30')
    expect(formatDue(at(2026, 10, 1, 18), NOW)).toBe('ontem 18h')
    expect(formatDue(at(2026, 10, 6, 18), NOW)).toBe('terça 18h')
    expect(formatDue(at(2026, 10, 4, 18), NOW)).toBe('domingo 18h')
    expect(formatDue(at(2026, 10, 20, 18), NOW)).toBe('20/10 18h')
    expect(formatDue(at(2027, 1, 5, 23, 59), NOW)).toBe('05/01/2027')
    expect(formatDue(at(2026, 10, 2, 23, 59), NOW)).toBe('hoje')
  })

  it('formatHour / formatEstimate', () => {
    expect(formatHour(at(2026, 10, 2, 8, 5))).toBe('8h05')
    expect(formatEstimate(15)).toBe('15 min')
    expect(formatEstimate(60)).toBe('1h')
    expect(formatEstimate(95)).toBe('1h 35min')
  })
})
