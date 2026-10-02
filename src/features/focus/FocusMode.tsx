// Modo Foco — tela cheia, anel de timer (10/15/25/45), micro-passos; fim: Concluiu? / +5 min / Pausa.
// TODO(próxima entrega): timer real com ProgressRing, Checkbox dos passos, focusCompleted(), aviso de 90 min.
import { useTasks } from '@/store'
import { Button, Sheet } from '@/ui'

interface Props {
  taskId?: string
  onClose: () => void
}

export function FocusMode({ taskId, onClose }: Props) {
  const task = useTasks((s) => s.tasks.find((t) => t.id === taskId))
  return (
    <Sheet open={taskId != null} onClose={onClose} aria-label="Modo foco">
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <h2 className="text-2xl font-semibold">{task?.title}</h2>
        <p className="text-5xl font-light tabular-nums">25:00</p>
        <Button variant="ghost" onClick={onClose}>
          Sair do foco
        </Button>
      </div>
    </Sheet>
  )
}
