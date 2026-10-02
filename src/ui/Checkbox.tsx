import { useId, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import { springs } from './motion'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Texto ao lado. Sem label visível, passe `aria-label`. */
  label?: ReactNode
  'aria-label'?: string
  /** Risca o texto quando marcado. Padrão: true. */
  strike?: boolean
  /** Cor do preenchimento. Padrão: 'accent'. */
  tone?: 'accent' | 'calm'
  /** Diâmetro em px. Padrão: 26. */
  size?: number
  disabled?: boolean
  className?: string
}

/** Checkbox circular estilo Lembretes: preenche com spring, desenha o ✓ e solta um "pulso". */
export function Checkbox({
  checked,
  onChange,
  label,
  'aria-label': ariaLabel,
  strike = true,
  tone = 'accent',
  size = 26,
  disabled,
  className,
}: CheckboxProps) {
  const labelId = useId()
  const reduced = useReducedMotion()
  const toggle = () => !disabled && onChange(!checked)

  return (
    <span
      className={clsx('ui-check-row', className)}
      data-checked={checked}
      data-disabled={disabled ? 'true' : undefined}
      onClick={toggle}
    >
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : ariaLabel}
        disabled={disabled}
        className="ui-check"
        data-tone={tone}
        style={{ ['--_s' as string]: `${size}px` }}
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        whileTap={disabled ? undefined : { scale: 0.86 }}
        transition={springs.snappy}
      >
        <span className="ui-check-ring" aria-hidden />
        <AnimatePresence initial={false}>
          {checked && (
            <motion.span
              key="fill"
              className="ui-check-fill"
              aria-hidden
              initial={reduced ? { opacity: 0 } : { scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
              transition={reduced ? { duration: 0.15 } : springs.bouncy}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {checked && !reduced && (
            <motion.span
              key="burst"
              className="ui-check-burst"
              aria-hidden
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </AnimatePresence>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={
              reduced
                ? { duration: 0 }
                : checked
                  ? { pathLength: { ...springs.smooth, delay: 0.06 }, opacity: { duration: 0.05 } }
                  : { duration: 0.12 }
            }
          />
        </svg>
      </motion.button>
      {label && (
        <span id={labelId} className="ui-check-label" data-strike={strike}>
          {label}
          {strike && (
            <motion.span
              className="ui-check-strike"
              aria-hidden
              initial={false}
              animate={{ scaleX: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
              transition={reduced ? { duration: 0 } : springs.smooth}
            />
          )}
        </span>
      )}
    </span>
  )
}
