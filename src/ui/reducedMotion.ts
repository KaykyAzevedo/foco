import { useReducedMotionConfig } from 'motion/react'

export type ReducedMotionMode = 'user' | 'always'

/**
 * Movimento reduzido EFETIVO: true se o app pediu ('always' no UIProvider)
 * ou se o sistema pede (prefers-reduced-motion) com 'user'. Use no lugar de useReducedMotion().
 */
export function useMotionReduced(): boolean {
  return useReducedMotionConfig() ?? false
}

/** Liga/desliga <html data-reduce-motion> — as animações CSS (fundo mesh, pulsos, brilhos) param com ele. */
export function applyReducedMotion(mode: ReducedMotionMode) {
  if (typeof document === 'undefined') return
  if (mode === 'always') document.documentElement.setAttribute('data-reduce-motion', '')
  else document.documentElement.removeAttribute('data-reduce-motion')
}
