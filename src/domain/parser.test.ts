import { describe, expect, it } from 'vitest'
import { parseCapture } from './parser'
import { at, NOW } from './test-utils'

const p = (s: string, now = NOW) => parseCapture(s, now)

describe('parseCapture — exemplos do produto', () => {
  it('"relatório vendas amanhã 15h !"', () => {
    const r = p('relatório vendas amanhã 15h !')
    expect(r.title).toBe('relatório vendas')
    expect(r.due).toBe(at(2026, 10, 3, 15))
    expect(r.urgent).toBe(true)
    expect(r.fromBoss).toBe(false)
    expect(r.chips.map((c) => c.kind)).toEqual(['due', 'urgent'])
    expect(r.chips[0].label).toBe('amanhã 15h')
  })

  it('"ligar fornecedor sexta #chefe" (hoje é sexta → próxima sexta)', () => {
    const r = p('ligar fornecedor sexta #chefe')
    expect(r.title).toBe('ligar fornecedor')
    expect(r.due).toBe(at(2026, 10, 9, 18))
    expect(r.fromBoss).toBe(true)
    expect(r.chips.find((c) => c.kind === 'boss')?.label).toBe('Da chefe')
  })

  it('"~15m" vira estimativa', () => {
    const r = p('responder email ~15m')
    expect(r.title).toBe('responder email')
    expect(r.estimateMin).toBe(15)
    expect(r.chips[0]).toMatchObject({ kind: 'estimate', label: '~15 min' })
  })
})

describe('parseCapture — texto puro', () => {
  it('sem tokens: só título, sem prazo', () => {
    const r = p('  comprar pão  ')
    expect(r).toEqual({ title: 'comprar pão', urgent: false, fromBoss: false, chips: [] })
  })

  it('só tokens: título cai para o texto original', () => {
    expect(p('amanhã').title).toBe('amanhã')
  })
})

describe('parseCapture — datas relativas', () => {
  it('hoje sem hora → hoje 18h', () => {
    expect(p('pagar conta hoje').due).toBe(at(2026, 10, 2, 18))
  })

  it('hoje sem hora depois das 18h → hoje 23:59', () => {
    expect(p('pagar conta hoje', new Date(2026, 9, 2, 19)).due).toBe(at(2026, 10, 2, 23, 59))
  })

  it('amanha (sem acento), hj e depois de amanhã', () => {
    expect(p('x amanha').due).toBe(at(2026, 10, 3, 18))
    expect(p('x hj').due).toBe(at(2026, 10, 2, 18))
    expect(p('x depois de amanhã').due).toBe(at(2026, 10, 4, 18))
    expect(p('x depois de amanhã').title).toBe('x')
  })

  it('remove preposições ligadas à data', () => {
    expect(p('entregar até amanhã').title).toBe('entregar')
    expect(p('reunião para amanhã às 9h').title).toBe('reunião')
    expect(p('reunião para amanhã às 9h').due).toBe(at(2026, 10, 3, 9))
  })

  it('maiúsculas', () => {
    expect(p('Relatório AMANHÃ 15H').due).toBe(at(2026, 10, 3, 15))
  })

  it('semana que vem / próxima semana → próxima segunda', () => {
    expect(p('revisar contrato semana que vem').due).toBe(at(2026, 10, 5, 18))
    expect(p('revisar contrato próxima semana').title).toBe('revisar contrato')
  })
})

describe('parseCapture — dias da semana', () => {
  it.each([
    ['segunda', 5],
    ['terça', 6],
    ['terca', 6],
    ['quarta-feira', 7],
    ['quinta feira', 8],
    ['sábado', 3],
    ['sabado', 3],
    ['domingo', 4],
  ])('%s → dia %i', (word, day) => {
    const r = p(`tarefa ${word}`)
    expect(r.due).toBe(at(2026, 10, day, 18))
    expect(r.title).toBe('tarefa')
  })

  it('"na quarta às 14h30"', () => {
    const r = p('dentista na quarta às 14h30')
    expect(r.title).toBe('dentista')
    expect(r.due).toBe(at(2026, 10, 7, 14, 30))
  })

  it('"próxima sexta"', () => {
    expect(p('x próxima sexta').due).toBe(at(2026, 10, 9, 18))
  })

  it('não confunde palavras que contêm o dia ("sextante")', () => {
    const r = p('comprar sextante')
    expect(r.due).toBeUndefined()
    expect(r.title).toBe('comprar sextante')
  })
})

describe('parseCapture — datas numéricas', () => {
  it('dd/mm', () => {
    const r = p('pagar boleto 10/10')
    expect(r.title).toBe('pagar boleto')
    expect(r.due).toBe(at(2026, 10, 10, 18))
  })

  it('dd/mm que já passou → ano seguinte', () => {
    expect(p('aniversário 15/01').due).toBe(at(2027, 1, 15, 18))
  })

  it('dd/mm/aaaa e dd/mm/aa', () => {
    expect(p('x 05/11/2026').due).toBe(at(2026, 11, 5, 18))
    expect(p('x 05/11/27').due).toBe(at(2027, 11, 5, 18))
  })

  it('"dia 10/10 às 9h"', () => {
    const r = p('consulta dia 10/10 às 9h')
    expect(r.title).toBe('consulta')
    expect(r.due).toBe(at(2026, 10, 10, 9))
  })

  it('data inválida fica no título', () => {
    const r = p('x 31/02')
    expect(r.due).toBeUndefined()
    expect(r.title).toBe('x 31/02')
  })

  it('"dia 15" → dia 15 deste mês; "dia 1" → mês que vem', () => {
    expect(p('x dia 15').due).toBe(at(2026, 10, 15, 18))
    expect(p('x dia 1').due).toBe(at(2026, 11, 1, 18))
    expect(p('consulta no dia 15').title).toBe('consulta')
  })
})

describe('parseCapture — horas', () => {
  it('15h, 15h30, 15:30, 9h, 15hs', () => {
    expect(p('x amanhã 15h30').due).toBe(at(2026, 10, 3, 15, 30))
    expect(p('x amanhã 15:30').due).toBe(at(2026, 10, 3, 15, 30))
    expect(p('x amanhã 9h').due).toBe(at(2026, 10, 3, 9))
    expect(p('x amanhã 15hs').due).toBe(at(2026, 10, 3, 15))
  })

  it('só hora no futuro → hoje', () => {
    const r = p('ligar 15h')
    expect(r.title).toBe('ligar')
    expect(r.due).toBe(at(2026, 10, 2, 15))
    expect(r.chips[0].label).toBe('hoje 15h')
  })

  it('só hora que já passou → amanhã', () => {
    expect(p('ligar 8h').due).toBe(at(2026, 10, 3, 8))
  })

  it('"3h da tarde", "8h da noite", "meio-dia"', () => {
    expect(p('x amanhã 3h da tarde').due).toBe(at(2026, 10, 3, 15))
    expect(p('x amanhã 8h da noite').due).toBe(at(2026, 10, 3, 20))
    expect(p('almoço meio-dia').due).toBe(at(2026, 10, 2, 12))
    expect(p('almoço meio-dia').title).toBe('almoço')
  })

  it('número solto com espaço antes de "h" não vira hora', () => {
    expect(p('estudar 2 h').due).toBeUndefined()
  })

  it('hora inválida fica no título', () => {
    const r = p('x 25h')
    expect(r.due).toBeUndefined()
    expect(r.title).toBe('x 25h')
  })

  it('ordem livre: hora antes da data', () => {
    expect(p('às 10h amanhã reunião').due).toBe(at(2026, 10, 3, 10))
    expect(p('às 10h amanhã reunião').title).toBe('reunião')
  })
})

describe('parseCapture — marcadores', () => {
  it('"!" no começo, no fim de palavra ou "!!"', () => {
    expect(p('!ligar banco').urgent).toBe(true)
    expect(p('!ligar banco').title).toBe('ligar banco')
    expect(p('ligar banco!').title).toBe('ligar banco')
    expect(p('ligar banco !!').urgent).toBe(true)
  })

  it('"!" no meio de palavra não é urgente', () => {
    expect(p('a!b').urgent).toBe(false)
  })

  it('#chefe em qualquer posição e caixa', () => {
    const r = p('#Chefe planilha de custos')
    expect(r.fromBoss).toBe(true)
    expect(r.title).toBe('planilha de custos')
  })

  it('outras hashtags ficam no título', () => {
    expect(p('estudar #ingles').title).toBe('estudar #ingles')
  })

  it('estimativas ~1h, ~1h30, ~45min, ~1,5h, ~20', () => {
    expect(p('x ~1h').estimateMin).toBe(60)
    expect(p('x ~1h30').estimateMin).toBe(90)
    expect(p('x ~45min').estimateMin).toBe(45)
    expect(p('x ~1,5h').estimateMin).toBe(90)
    expect(p('x ~20').estimateMin).toBe(20)
    expect(p('x ~1h30').chips[0].label).toBe('~1h 30min')
  })

  it('tudo junto', () => {
    const r = p('#chefe enviar proposta sexta 9h ~30m !')
    expect(r).toMatchObject({
      title: 'enviar proposta',
      due: at(2026, 10, 9, 9),
      urgent: true,
      fromBoss: true,
      estimateMin: 30,
    })
    expect(r.chips.map((c) => c.kind).sort()).toEqual(['boss', 'due', 'estimate', 'urgent'])
  })

  it('opção defaultHour', () => {
    expect(parseCapture('x amanhã', NOW, { defaultHour: 9 }).due).toBe(at(2026, 10, 3, 9))
  })
})
