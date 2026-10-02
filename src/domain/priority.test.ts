import { describe, expect, it } from 'vitest'
import { compareTasks, isOverdue, nextTask, score, sortByPriority, urgencyOf, WEIGHTS } from './priority'
import { at, makeTask, NOW } from './test-utils'

describe('score', () => {
  it('tarefa simples sem nada vale 0', () => {
    expect(score(makeTask(), NOW)).toBe(0)
  })

  it('concluída vale -Infinity', () => {
    expect(score(makeTask({ doneAt: at(2026, 10, 2, 9) }), NOW)).toBe(-Infinity)
  })

  it('aplica faixas de prazo exclusivas', () => {
    expect(score(makeTask({ due: at(2026, 10, 2, 9) }), NOW)).toBe(WEIGHTS.overdue)
    expect(score(makeTask({ due: at(2026, 10, 2, 11, 30) }), NOW)).toBe(WEIGHTS.dueUnder2h)
    expect(score(makeTask({ due: at(2026, 10, 2, 18) }), NOW)).toBe(WEIGHTS.dueToday)
    expect(score(makeTask({ due: at(2026, 10, 3, 18) }), NOW)).toBe(WEIGHTS.dueTomorrow)
    expect(score(makeTask({ due: at(2026, 10, 10, 18) }), NOW)).toBe(0)
  })

  it('prazo amanhã de madrugada dentro de 2h conta como < 2h', () => {
    const late = new Date(2026, 9, 2, 23, 30)
    expect(score(makeTask({ due: at(2026, 10, 3, 0, 30) }), late)).toBe(WEIGHTS.dueUnder2h)
  })

  it('soma chefe, urgente, principal planejada e vitória rápida', () => {
    const t = makeTask({ fromBoss: true, urgent: true, plannedFor: '2026-10-02', isMain: true, estimateMin: 10 })
    expect(score(t, NOW)).toBe(
      WEIGHTS.fromBoss + WEIGHTS.urgent + WEIGHTS.plannedToday + WEIGHTS.isMain + WEIGHTS.quickWin,
    )
  })

  it('isMain de outro dia não conta', () => {
    expect(score(makeTask({ plannedFor: '2026-10-01', isMain: true }), NOW)).toBe(0)
  })

  it('pulada hoje perde 50; pulada ontem não', () => {
    expect(score(makeTask({ skippedAt: at(2026, 10, 2, 9) }), NOW)).toBe(WEIGHTS.skippedRecently)
    expect(score(makeTask({ skippedAt: at(2026, 10, 1, 9) }), NOW)).toBe(0)
  })

  it('estimativa de 16 min não é vitória rápida', () => {
    expect(score(makeTask({ estimateMin: 16 }), NOW)).toBe(0)
  })
})

describe('nextTask', () => {
  it('lista vazia ou só concluídas → undefined', () => {
    expect(nextTask([], NOW)).toBeUndefined()
    expect(nextTask([makeTask({ doneAt: at(2026, 10, 1) })], NOW)).toBeUndefined()
  })

  it('escolhe a de maior score', () => {
    const a = makeTask({ title: 'a' })
    const b = makeTask({ title: 'b', fromBoss: true })
    const c = makeTask({ title: 'c', due: at(2026, 10, 1, 18) })
    expect(nextTask([a, b, c], NOW)?.title).toBe('c')
  })

  it('pular manda para o fim da fila mesmo com score alto', () => {
    const boss = makeTask({ title: 'chefe atrasada', fromBoss: true, due: at(2026, 10, 1), skippedAt: at(2026, 10, 2, 9, 50) })
    const plain = makeTask({ title: 'simples' })
    expect(nextTask([boss, plain], NOW)?.title).toBe('simples')
  })

  it('entre puladas, a pulada há mais tempo volta primeiro', () => {
    const a = makeTask({ title: 'a', skippedAt: at(2026, 10, 2, 9, 30) })
    const b = makeTask({ title: 'b', skippedAt: at(2026, 10, 2, 9, 0) })
    expect(nextTask([a, b], NOW)?.title).toBe('b')
  })

  it('pulada ontem volta ao normal', () => {
    const a = makeTask({ title: 'a', fromBoss: true, skippedAt: at(2026, 10, 1, 9) })
    const b = makeTask({ title: 'b' })
    expect(nextTask([b, a], NOW)?.title).toBe('a')
  })

  it('desempata pelo prazo mais cedo, depois ordem manual, depois criação', () => {
    const late = makeTask({ title: 'late', due: at(2026, 10, 20) })
    const early = makeTask({ title: 'early', due: at(2026, 10, 15) })
    expect(nextTask([late, early], NOW)?.title).toBe('early')

    const o2 = makeTask({ title: 'o2', order: 2 })
    const o1 = makeTask({ title: 'o1', order: 1 })
    expect(nextTask([o2, o1], NOW)?.title).toBe('o1')

    const first = makeTask({ title: 'first', createdAt: at(2026, 9, 1) })
    const second = makeTask({ title: 'second', createdAt: at(2026, 9, 2) })
    expect(nextTask([second, first], NOW)?.title).toBe('first')
  })

  it('não muta o array original', () => {
    const list = [makeTask({ title: 'x' }), makeTask({ title: 'y', urgent: true })]
    const copy = [...list]
    sortByPriority(list, NOW)
    expect(list).toEqual(copy)
  })

  it('compareTasks é antissimétrico', () => {
    const a = makeTask({ urgent: true })
    const b = makeTask({ fromBoss: true })
    expect(Math.sign(compareTasks(a, b, NOW))).toBe(-Math.sign(compareTasks(b, a, NOW)))
  })
})

describe('urgencyOf', () => {
  it('classifica pelo tempo restante', () => {
    expect(urgencyOf(makeTask({ due: at(2026, 10, 2, 9) }), NOW)).toBe('overdue')
    expect(urgencyOf(makeTask({ due: at(2026, 10, 2, 11) }), NOW)).toBe('urgent')
    expect(urgencyOf(makeTask({ due: at(2026, 10, 2, 20) }), NOW)).toBe('soon')
    expect(urgencyOf(makeTask({ due: at(2026, 10, 3, 9) }), NOW)).toBe('soon')
    expect(urgencyOf(makeTask({ due: at(2026, 10, 5) }), NOW)).toBe('calm')
    expect(urgencyOf(makeTask(), NOW)).toBe('calm')
  })

  it('"!" sobe um degrau', () => {
    expect(urgencyOf(makeTask({ urgent: true }), NOW)).toBe('soon')
    expect(urgencyOf(makeTask({ urgent: true, due: at(2026, 10, 2, 20) }), NOW)).toBe('urgent')
    expect(urgencyOf(makeTask({ urgent: true, due: at(2026, 10, 9) }), NOW)).toBe('soon')
  })

  it('concluída é sempre calm e nunca atrasada', () => {
    const t = makeTask({ due: at(2026, 10, 1), doneAt: at(2026, 10, 2, 9) })
    expect(urgencyOf(t, NOW)).toBe('calm')
    expect(isOverdue(t, NOW)).toBe(false)
  })
})
