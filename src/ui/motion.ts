import { useReducedMotion, type Transition, type Variants } from 'motion/react'

/**
 * Springs padronizados do Foco. Use sempre estes, nunca durações soltas.
 * - snappy: toques, toggles, indicadores (rápido, sem overshoot visível)
 * - smooth: entradas/saídas de cards, sheets, layout
 * - bouncy: recompensas (check, XP, conquistas) — um pouco de overshoot alegre
 */
export const springs = {
  snappy: { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 },
  smooth: { type: 'spring', stiffness: 260, damping: 32, mass: 1 },
  bouncy: { type: 'spring', stiffness: 420, damping: 18, mass: 0.9 },
  /** Para movimentos ambientes/lentos (ex.: anel de progresso) */
  gentle: { type: 'spring', stiffness: 120, damping: 22, mass: 1 },
} as const satisfies Record<string, Transition>

export type SpringName = keyof typeof springs

/** Transição instantânea (usada quando o usuário pede menos movimento). */
export const instant: Transition = { duration: 0 }

/** Transição suave só de opacidade, aceitável mesmo com reduced motion. */
export const fade: Transition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] }

/** Devolve a spring pedida, ou um fade curto se `prefers-reduced-motion` estiver ativo. */
export function useSpringTransition(name: SpringName = 'smooth'): Transition {
  const reduced = useReducedMotion()
  return reduced ? fade : springs[name]
}

/** Variants prontas para listas/cards. Use com `initial="hidden" animate="show" exit="exit"`. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: springs.smooth },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: springs.snappy },
}

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: springs.bouncy },
  exit: { opacity: 0, scale: 0.8, transition: springs.snappy },
}

/** Container que escalona os filhos (stagger). */
export const stagger = (step = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step } },
})

/** Escala padrão ao pressionar elementos tocáveis. */
export const pressScale = 0.96
