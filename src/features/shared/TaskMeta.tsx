// Linha de metadados de uma tarefa: prazo (contagem regressiva), da chefe, urgente, estimativa.
import { Crown, Timer, Zap } from 'lucide-react'
import { formatEstimate, urgencyOf, type Task } from '@/domain'
import { Chip, Countdown } from '@/ui'

interface Props {
  task: Task
  /** "agora" do pai (useNow/useToday já atualizam) — evita um relógio por item */
  now: Date
  size?: 'sm' | 'md'
  className?: string
}

export function TaskMeta({ task, now, size = 'md', className }: Props) {
  const icon = size === 'sm' ? 12 : 14
  const hasAny = task.due || task.fromBoss || task.urgent || task.estimateMin != null
  if (!hasAny) return null
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ''}`}>
      {task.due && (
        <Countdown due={task.due} urgency={urgencyOf(task, now)} variant={size === 'sm' ? 'inline' : 'pill'} />
      )}
      {task.fromBoss && (
        <Chip size={size} tone="boss" icon={<Crown aria-hidden size={icon} />}>
          {size === 'sm' ? 'Chefe' : 'Pedido da chefe'}
        </Chip>
      )}
      {task.urgent && (
        <Chip size={size} tone="urgent" icon={<Zap aria-hidden size={icon} />}>
          Urgente
        </Chip>
      )}
      {task.estimateMin != null && (
        <Chip size={size} icon={<Timer aria-hidden size={icon} />}>
          {formatEstimate(task.estimateMin)}
        </Chip>
      )}
    </div>
  )
}
