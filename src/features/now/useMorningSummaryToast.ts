// Resumo do dia: 1x por dia, ao abrir o app ou ao voltar pra aba num dia novo.
// "Bom dia / Boa tarde / Boa noite" conforme a hora; o texto é o resumo do dia.
import { useEffect } from 'react'
import { dayKey, morningSummary } from '@/domain'
import { useSettings, useTasks } from '@/store'
import { toast } from '@/ui'

export function greeting(now: Date): string {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Bom dia ☀️'
  if (h >= 12 && h < 18) return 'Boa tarde 🌤️'
  return 'Boa noite 🌙'
}

function showIfNewDay() {
  const now = new Date()
  const day = dayKey(now)
  const settings = useSettings.getState()
  if (settings.lastMorningSummary === day) return
  settings.markMorningSummary(day)
  const { text } = morningSummary(useTasks.getState().tasks, now)
  toast({ title: greeting(now), description: text, duration: 6000 })
}

export function useMorningSummaryToast() {
  useEffect(() => {
    showIfNewDay()
    const onVisible = () => {
      if (document.visibilityState === 'visible') showIfNewDay()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}
