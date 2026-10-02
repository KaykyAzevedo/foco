import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import clsx from 'clsx'

export type GlassIntensity = 'thin' | 'regular' | 'thick'
export type GlassRadius = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type GlassTint = 'none' | 'accent' | 'calm' | 'soon' | 'urgent' | 'overdue' | 'boss'

export interface GlassProps extends HTMLMotionProps<'div'> {
  /** Espessura do vidro (blur + opacidade). Padrão: 'regular'. */
  intensity?: GlassIntensity
  /** Raio dos cantos. Padrão: 'lg' (24px). */
  radius?: GlassRadius
  /** Tingimento sutil da cor do vidro. */
  tint?: GlassTint
  /** Hover mais claro + cursor (use quando o card inteiro é clicável). */
  interactive?: boolean
  /** 'flat' remove a sombra externa (bom para vidro dentro de vidro). */
  elevation?: 'raised' | 'flat'
}

/** Superfície "liquid glass": blur, borda de luz e realce especular. Aceita todas as props de motion.div. */
export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { intensity = 'regular', radius = 'lg', tint = 'none', interactive, elevation = 'raised', className, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      className={clsx('ui-glass', className)}
      data-intensity={intensity}
      data-radius={radius}
      data-tint={tint === 'none' ? undefined : tint}
      data-interactive={interactive ? 'true' : undefined}
      data-elevation={elevation}
      {...rest}
    />
  )
})
