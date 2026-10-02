// Celebrações com canvas-confetti. Respeita prefers-reduced-motion.
import confetti from 'canvas-confetti'
import type { Reward } from '@/domain'

export type CelebrationKind = 'small' | 'level' | 'achievement' | 'mission' | 'allClear'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

const COLORS = ['#7c9cff', '#a78bfa', '#5eead4', '#fbbf24', '#f472b6']

let canvasOk: boolean | undefined
/** Ambientes sem canvas 2D (jsdom nos testes) não soltam confete. */
function canDraw(): boolean {
  if (canvasOk === undefined) {
    try {
      canvasOk = !!document.createElement('canvas').getContext('2d')
    } catch {
      canvasOk = false
    }
  }
  return canvasOk
}

export function celebrate(kind: CelebrationKind = 'small'): void {
  if (typeof window === 'undefined' || prefersReducedMotion() || !canDraw()) return
  const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 9999 }
  switch (kind) {
    case 'small':
      void confetti({ ...base, particleCount: 40, spread: 55, startVelocity: 30, origin: { y: 0.7 } })
      break
    case 'mission':
    case 'achievement':
      void confetti({ ...base, particleCount: 90, spread: 80, origin: { y: 0.6 } })
      break
    case 'level':
    case 'allClear': {
      const end = Date.now() + 900
      const frame = () => {
        void confetti({ ...base, particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } })
        void confetti({ ...base, particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
      break
    }
  }
}

/** Qual celebração uma recompensa merece (puro). Tarefa comum não solta confete — só marcos. */
export function celebrationFor(reward: Reward): CelebrationKind | undefined {
  if (reward.leveledUp) return 'level'
  if (reward.unlocked.length) return 'achievement'
  if (reward.missionCompleted) return 'mission'
  return undefined
}

/** Solta o confete adequado; devolve o tipo usado (undefined se não era marco). */
export function celebrateReward(reward: Reward | undefined): CelebrationKind | undefined {
  if (!reward) return undefined
  const kind = celebrationFor(reward)
  if (kind) celebrate(kind)
  return kind
}
