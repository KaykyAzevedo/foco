import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { Toaster } from './Toast'

/**
 * Envolva o app uma vez: aplica prefers-reduced-motion a todas as animações do motion
 * e monta a região de toasts.
 */
export function UIProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster />
    </MotionConfig>
  )
}
