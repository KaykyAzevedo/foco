// Progresso do dia (anel) + missão diária, num card discreto.
import { Target } from 'lucide-react'
import type { DayProgress as Progress } from '@/domain'
import { useGameSummary } from '@/store'
import { Glass, ProgressRing } from '@/ui'

export function DayProgress({ progress }: { progress: Progress }) {
  const { mission } = useGameSummary()
  const allDone = progress.total > 0 && progress.done === progress.total
  return (
    <Glass intensity="thin" radius="lg" className="flex items-center gap-4 p-4">
      <ProgressRing
        progress={progress.ratio}
        size={64}
        tone={allDone ? 'calm' : 'accent'}
        label="Progresso do dia"
        valueText={`${progress.done} de ${progress.total} feitas`}
      >
        <span className="text-sm font-semibold tabular-nums">
          {progress.done}/{progress.total}
        </span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {allDone ? 'Dia completo! 🎉' : progress.done === 0 ? 'Bora começar' : 'Seguindo firme'}
        </p>
        <p className="flex items-start gap-1.5 text-sm text-text-2">
          <Target aria-hidden size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="sr-only">Missão do dia: </span>
            {mission.mission.title}{' '}
            {mission.done ? (
              <span className="text-calm-ink">✓ cumprida</span>
            ) : (
              <span className="tabular-nums">
                ({mission.progress}/{mission.target})
              </span>
            )}
          </span>
        </p>
      </div>
    </Glass>
  )
}
