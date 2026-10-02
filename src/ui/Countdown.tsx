import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { formatCountdown, formatDueFull, toDate, urgencyFromDue, type Urgency } from './countdown-format'
import { springs } from './motion'

export interface CountdownProps {
  /** Prazo (ISO string ou Date). */
  due: string | Date
  /** Urgência vinda do domínio (`urgencyOf`). Se omitida, é calculada pelo prazo. */
  urgency?: Urgency
  /** 'pill' (fundo colorido) ou 'inline' (só bolinha + texto). Padrão: 'pill'. */
  variant?: 'pill' | 'inline'
  size?: 'md' | 'lg'
  /** "Agora" fixo (útil em testes). Sem isso, atualiza sozinho. */
  now?: Date
  className?: string
}

const SR_PREFIX: Record<Urgency, string> = {
  calm: 'Prazo tranquilo',
  soon: 'Prazo próximo',
  urgent: 'Prazo urgente',
  overdue: 'Prazo passou',
}

function useNow(fixed: Date | undefined, due: Date): Date {
  const [now, setNow] = useState(() => new Date())
  const isFixed = fixed !== undefined
  useEffect(() => {
    if (isFixed) return
    let id: ReturnType<typeof setTimeout>
    const schedule = () => {
      const near = Math.abs(due.getTime() - Date.now()) < 2 * 3_600_000
      id = setTimeout(() => {
        setNow(new Date())
        schedule()
      }, near ? 15_000 : 60_000)
    }
    schedule()
    return () => clearTimeout(id)
  }, [isFixed, due])
  return fixed ?? now
}

/** Contagem regressiva colorida por urgência: calmo → atenção → urgente → passou. Sem piscar. */
export function Countdown({ due, urgency, variant = 'pill', size = 'md', now: fixedNow, className }: CountdownProps) {
  const dueDate = toDate(due)
  const dueMs = dueDate.getTime()
  // estabiliza a dependência do efeito por valor (não por identidade)
  const [stableDue] = useStableDate(dueMs)
  const now = useNow(fixedNow, stableDue)
  const u = urgency ?? urgencyFromDue(dueDate, now)
  const text = formatCountdown(dueDate, now)

  return (
    <span
      className={clsx('ui-countdown', className)}
      data-urgency={u}
      data-variant={variant}
      data-size={size}
      title={formatDueFull(dueDate)}
    >
      <span className="ui-countdown-dot" aria-hidden />
      <span className="ui-sr-only">{SR_PREFIX[u]}: </span>
      <span style={{ display: 'inline-grid' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.time
            key={text}
            dateTime={dueDate.toISOString()}
            initial={{ opacity: 0, y: 6, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
            transition={springs.snappy}
            style={{ gridArea: '1 / 1' }}
          >
            {text}
          </motion.time>
        </AnimatePresence>
      </span>
    </span>
  )
}

function useStableDate(ms: number): [Date] {
  const [state, setState] = useState(() => ({ ms, date: new Date(ms) }))
  if (state.ms !== ms) {
    const next = { ms, date: new Date(ms) }
    setState(next)
    return [next.date]
  }
  return [state.date]
}
