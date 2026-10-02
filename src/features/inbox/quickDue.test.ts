import { dayKey } from '@/domain'
import { DUE_PRESETS, duePresets, isPresetSelected, presetDue } from './quickDue'

// quarta-feira, 1º de outubro de 2025, 10h
const now = new Date(2025, 9, 1, 10, 0)
const byId = (id: string) => DUE_PRESETS.find((p) => p.id === id)!

describe('presetDue', () => {
  it('todos os chips geram um prazo', () => {
    for (const p of DUE_PRESETS) expect(presetDue(p, now), p.label).toBeDefined()
  })

  it('hoje, amanhã e sexta caem no dia certo', () => {
    expect(dayKey(presetDue(byId('today'), now)!)).toBe('2025-10-01')
    expect(dayKey(presetDue(byId('tomorrow'), now)!)).toBe('2025-10-02')
    expect(dayKey(presetDue(byId('friday'), now)!)).toBe('2025-10-03')
  })

  it('próxima semana é depois desta semana', () => {
    expect(dayKey(presetDue(byId('nextWeek'), now)!) > '2025-10-05').toBe(true)
  })

  it('isPresetSelected compara pelo dia', () => {
    const due = new Date(2025, 9, 2, 9, 0).toISOString()
    expect(isPresetSelected(byId('tomorrow'), due, now)).toBe(true)
    expect(isPresetSelected(byId('today'), due, now)).toBe(false)
    expect(isPresetSelected(byId('today'), undefined, now)).toBe(false)
  })
})

describe('duePresets (sem ambiguidade)', () => {
  const labels = (d: Date) => duePresets(d).map((c) => c.label)
  const days = (d: Date) => duePresets(d).map((c) => dayKey(c.due))

  it('quarta: os 4 chips, cada um num dia', () => {
    expect(labels(now)).toEqual(['Vence hoje', 'Amanhã', 'Sexta', 'Próx. semana'])
  })

  it('nunca há dois chips no mesmo dia (semana inteira)', () => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(2025, 9, 1 + i, 10, 0)
      expect(new Set(days(d)).size, d.toDateString()).toBe(days(d).length)
    }
  })

  it('quinta: Sexta coincide com Amanhã e some', () => {
    expect(labels(new Date(2025, 9, 2, 10, 0))).not.toContain('Sexta')
  })

  it('sexta: o chip vira "Próx. sexta"', () => {
    expect(labels(new Date(2025, 9, 3, 10, 0))).toContain('Próx. sexta')
  })
})
