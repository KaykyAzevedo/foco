import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import clsx from 'clsx'
import { pressScale, springs } from './motion'

export type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Ícone à esquerda (ex.: <Play />). */
  icon?: ReactNode
  /** Ícone à direita. */
  iconRight?: ReactNode
  /** Botão só com ícone (circular). Exige `aria-label`. */
  iconOnly?: boolean
  loading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

/** Botão com spring ao pressionar. `primary` = ação principal da tela (só uma por tela!). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    iconOnly,
    loading,
    fullWidth,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const inactive = disabled || loading
  return (
    <motion.button
      ref={ref}
      type={type}
      className={clsx('ui-btn', variant === 'glass' && 'ui-glass', className)}
      data-variant={variant}
      data-size={size}
      data-icon-only={iconOnly ? 'true' : undefined}
      data-full={fullWidth ? 'true' : undefined}
      data-loading={loading ? 'true' : undefined}
      data-radius={variant === 'glass' ? 'full' : undefined}
      data-intensity={variant === 'glass' ? 'regular' : undefined}
      data-elevation={variant === 'glass' ? 'raised' : undefined}
      disabled={inactive}
      aria-busy={loading || undefined}
      whileTap={inactive ? undefined : { scale: pressScale }}
      whileHover={inactive ? undefined : { scale: 1.015 }}
      transition={springs.snappy}
      {...rest}
    >
      {loading ? <span className="ui-spinner" aria-hidden /> : icon}
      {iconOnly ? null : children}
      {!loading && iconRight}
    </motion.button>
  )
})
