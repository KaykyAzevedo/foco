import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { useSpringTransition } from './motion'

export type RingTone = 'accent' | 'calm' | 'soon' | 'urgent' | 'overdue' | 'xp'

const GRADIENTS: Record<RingTone, [string, string]> = {
  accent: ['#8f8cff', '#5856d6'],
  calm: ['#5ee6bd', '#1fa77f'],
  soon: ['#ffd36b', '#f5a623'],
  urgent: ['#ffb08a', '#ff6a2e'],
  overdue: ['#ff9ab9', '#e2477c'],
  xp: ['#ffe27a', '#ff8a00'],
}

export interface ProgressRingProps {
  /** Progresso de 0 a 1 (valores fora disso são limitados). */
  progress: number
  /** Diâmetro em px. Padrão: 56. */
  size?: number
  /** Espessura do traço em px. Padrão: size/9. */
  strokeWidth?: number
  tone?: RingTone
  /** Conteúdo no centro (ex.: "12:30", ícone, nível). */
  children?: ReactNode
  /** Rótulo para leitores de tela. Padrão: "Progresso". */
  label?: string
  /** Texto de valor para leitores de tela (ex.: "12 minutos restantes"). Padrão: porcentagem. */
  valueText?: string
  /** Esconde a trilha de fundo. */
  hideTrack?: boolean
  className?: string
}

/** Anel de progresso com gradiente e spring. Usado no timer do foco, no dia e no XP. */
export function ProgressRing({
  progress,
  size = 56,
  strokeWidth,
  tone = 'accent',
  children,
  label = 'Progresso',
  valueText,
  hideTrack,
  className,
}: ProgressRingProps) {
  const id = useId()
  const gradId = `ring-${id}`
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  const sw = strokeWidth ?? Math.max(3, Math.round(size / 9))
  const r = (size - sw) / 2
  const c = size / 2
  const transition = useSpringTransition('gentle')
  const [from, to] = GRADIENTS[tone]

  return (
    <div
      className={clsx('ui-ring', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      aria-valuetext={valueText}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        {!hideTrack && <circle className="ui-ring-track" cx={c} cy={c} r={r} fill="none" strokeWidth={sw} />}
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={sw}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: p, opacity: p > 0.001 ? 1 : 0 }}
          transition={transition}
          style={{ filter: `drop-shadow(0 0 ${sw / 1.5}px ${to}55)` }}
        />
      </svg>
      {children !== undefined && <div className="ui-ring-label">{children}</div>}
    </div>
  )
}
