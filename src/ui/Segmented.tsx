import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { springs } from './motion'

export interface SegmentedOption<T extends string = string> {
  id: T
  label: string
  icon?: ReactNode
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
  /** Nome do grupo para leitores de tela (ex.: "Tema"). Ou use aria-labelledby. */
  'aria-label'?: string
  'aria-labelledby'?: string
  size?: 'sm' | 'md'
  /** Ocupa toda a largura (segmentos iguais). Padrão: true. */
  fullWidth?: boolean
  className?: string
}

/**
 * Segmented control de vidro (estilo Apple) para escolhas exclusivas.
 * radiogroup com roving tabindex: ←/→ (e ↑/↓, Home/End) movem a seleção; o indicador desliza (layoutId).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  size = 'md',
  fullWidth = true,
  className,
}: SegmentedProps<T>) {
  const layoutId = `ui-seg-${useId()}`
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  )

  const move = (e: KeyboardEvent, index: number) => {
    const n = options.length
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % n
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    if (next < 0) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(options[next].id)
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      className={clsx('ui-segmented', className)}
      data-size={size}
      data-full={fullWidth}
      style={{ ['--_n' as string]: options.length }}
    >
      {options.map((o, i) => {
        const checked = o.id === value
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={i === selectedIndex ? 0 : -1}
            className="ui-segment"
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => move(e, i)}
          >
            {checked && (
              <motion.span layoutId={layoutId} className="ui-segment-indicator" transition={springs.snappy} aria-hidden />
            )}
            <span className="ui-segment-content">
              {o.icon && (
                <span className="ui-segment-icon" aria-hidden>
                  {o.icon}
                </span>
              )}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
