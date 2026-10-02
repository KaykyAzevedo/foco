// Chips de prazo da triagem. Usam o próprio parser da captura, para "sexta" significar
// exatamente o mesmo nos dois lugares (hora padrão, "próxima sexta" etc.).
import { dayKey, parseCapture } from '@/domain'

export interface DuePreset {
  id: 'today' | 'tomorrow' | 'friday' | 'nextWeek'
  label: string
  /** expressão em PT-BR entendida pelo parser */
  phrase: string
}

export const DUE_PRESETS: readonly DuePreset[] = [
  // "Vence hoje" (não só "Hoje") para não confundir com "Mandar pra Hoje", que é o plano do dia
  { id: 'today', label: 'Vence hoje', phrase: 'hoje' },
  { id: 'tomorrow', label: 'Amanhã', phrase: 'amanhã' },
  { id: 'friday', label: 'Sexta', phrase: 'sexta' },
  { id: 'nextWeek', label: 'Próx. semana', phrase: 'semana que vem' },
]

/** Prazo (ISO) de um chip, relativo a `now`. */
export function presetDue(preset: DuePreset, now: Date): string | undefined {
  return parseCapture(`tarefa ${preset.phrase}`, now).due
}

export interface DueChip {
  preset: DuePreset
  label: string
  due: string
}

/**
 * Chips para mostrar agora, sem ambiguidade: some o chip que cai no mesmo dia de um anterior
 * (quinta: Sexta = Amanhã; domingo: Próx. semana = Amanhã) e, numa sexta, "Sexta" vira "Próx. sexta".
 */
export function duePresets(now: Date): DueChip[] {
  const seen = new Set<string>()
  const chips: DueChip[] = []
  for (const preset of DUE_PRESETS) {
    const due = presetDue(preset, now)
    if (!due || seen.has(dayKey(due))) continue
    seen.add(dayKey(due))
    const label = preset.id === 'friday' && now.getDay() === 5 ? 'Próx. sexta' : preset.label
    chips.push({ preset, label, due })
  }
  return chips
}

/** O prazo atual cai no mesmo dia do chip? (para marcar o chip como selecionado) */
export function isPresetSelected(preset: DuePreset, due: string | undefined, now: Date): boolean {
  const target = presetDue(preset, now)
  return !!due && !!target && dayKey(due) === dayKey(target)
}
