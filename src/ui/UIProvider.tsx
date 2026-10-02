import { useEffect, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { Toaster } from './Toast'
import { applyReducedMotion, type ReducedMotionMode } from './reducedMotion'

export interface UIProviderProps {
  children: ReactNode
  /**
   * 'user' (padrão): segue prefers-reduced-motion do sistema.
   * 'always': o app pediu menos movimento (Ajustes) — vale para motion E para as animações CSS.
   */
  reducedMotion?: ReducedMotionMode
}

/**
 * Envolva o app uma vez: aplica a preferência de movimento a todas as animações
 * (motion + CSS via <html data-reduce-motion>) e monta a região de toasts.
 */
export function UIProvider({ children, reducedMotion = 'user' }: UIProviderProps) {
  useEffect(() => {
    applyReducedMotion(reducedMotion)
  }, [reducedMotion])

  return (
    <MotionConfig reducedMotion={reducedMotion}>
      {children}
      <Toaster />
    </MotionConfig>
  )
}
