import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { pressScale, springs } from './motion'

export type ChipTone = 'neutral' | 'accent' | 'calm' | 'soon' | 'urgent' | 'overdue' | 'boss'

export interface ChipProps {
  children: ReactNode
  tone?: ChipTone
  size?: 'sm' | 'md'
  icon?: ReactNode
  /**
   * Estado selecionado (vira botão de alternância com aria-pressed).
   * Ex.: chips de prazo "Hoje / Amanhã / Sexta".
   */
  selected?: boolean
  /** Se presente, o chip é um <button>. Sem onClick, é um rótulo estático. */
  onClick?: () => void
  /** Mostra um "x" para remover (ex.: chip detectado na captura). */
  onRemove?: () => void
  /** Rótulo acessível do botão de remover. Padrão: "Remover {children}". */
  removeLabel?: string
  className?: string
  title?: string
}

/** Pílula pequena: rótulos (tom de urgência, "da chefe") ou opções selecionáveis. */
export function Chip({
  children,
  tone = 'neutral',
  size = 'md',
  icon,
  selected,
  onClick,
  onRemove,
  removeLabel,
  className,
  title,
}: ChipProps) {
  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  )
  const removeBtn = onRemove && (
    <button
      type="button"
      className="ui-chip-remove ui-focusable"
      aria-label={removeLabel ?? `Remover ${typeof children === 'string' ? children : ''}`.trim()}
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
    >
      <X aria-hidden strokeWidth={3} />
    </button>
  )

  if (onClick) {
    return (
      <motion.button
        type="button"
        layout="position"
        className={clsx('ui-chip', className)}
        data-tone={tone}
        data-size={size}
        aria-pressed={selected === undefined ? undefined : selected}
        onClick={onClick}
        title={title}
        whileTap={{ scale: pressScale }}
        transition={springs.snappy}
      >
        {content}
        {removeBtn}
      </motion.button>
    )
  }
  return (
    <span
      className={clsx('ui-chip', className)}
      data-tone={tone}
      data-size={size}
      data-selected={selected ? 'true' : undefined}
      title={title}
    >
      {content}
      {removeBtn}
    </span>
  )
}
