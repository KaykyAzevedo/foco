import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import { ProgressRing } from './ProgressRing'
import { springs } from './motion'

export interface XPOrbProps {
  /** Nível atual. */
  level: number
  /** XP acumulado dentro do nível atual. */
  xp: number
  /** XP necessário para subir de nível (a partir do início do nível). Padrão: 100. */
  xpToNext?: number
  /** Abre a folha de detalhes de gamificação. */
  onClick?: () => void
  /** Diâmetro total em px. Padrão: 48. */
  size?: number
  className?: string
}

/**
 * Orb dourado de XP com anel de progresso do nível.
 * Detecta sozinho ganhos de XP (mostra "+N") e subida de nível (pulso + "Nível N!").
 */
export function XPOrb({ level, xp, xpToNext = 100, onClick, size = 48, className }: XPOrbProps) {
  const reduced = useReducedMotion()
  const controls = useAnimationControls()
  const prev = useRef({ level, xp })
  const [gain, setGain] = useState<{ key: number; text: string } | null>(null)

  useEffect(() => {
    const p = prev.current
    prev.current = { level, xp }
    let text: string | null = null
    if (level > p.level) text = `Nível ${level}!`
    else if (level === p.level && xp > p.xp) text = `+${Math.round(xp - p.xp)} XP`
    if (!text) return
    setGain({ key: Date.now(), text })
    if (!reduced) {
      void controls.start({
        scale: level > p.level ? [1, 1.35, 1] : [1, 1.15, 1],
        transition: { duration: level > p.level ? 0.7 : 0.45, ease: [0.34, 1.56, 0.64, 1] },
      })
    }
    const id = setTimeout(() => setGain(null), 1400)
    return () => clearTimeout(id)
  }, [level, xp, reduced, controls])

  const progress = xpToNext > 0 ? xp / xpToNext : 0
  const ring = Math.max(3, Math.round(size / 13))
  const core = size - ring * 2 - 6

  return (
    <motion.button
      type="button"
      className={clsx('ui-xporb', className)}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={`Nível ${level}, ${Math.round(xp)} de ${xpToNext} XP. Ver progresso`}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.06 }}
      transition={springs.snappy}
    >
      <AnimatePresence>
        {gain && !reduced && (
          <motion.span
            key={`glow-${gain.key}`}
            className="ui-xporb-glow"
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1 }}
          />
        )}
      </AnimatePresence>
      <span aria-hidden style={{ display: 'contents' }}>
        <ProgressRing progress={progress} size={size} strokeWidth={ring} tone="xp" label="XP do nível" />
      </span>
      <motion.span
        className="ui-xporb-core"
        animate={controls}
        style={{ width: core, height: core, position: 'absolute', fontSize: Math.max(11, core * 0.4) }}
        aria-hidden
      >
        {level}
      </motion.span>
      <AnimatePresence>
        {gain && (
          <motion.span
            key={gain.key}
            className="ui-xporb-gain"
            aria-hidden
            initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.6 }}
            animate={{ opacity: 1, y: -26, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -40, x: '-50%' }}
            transition={reduced ? { duration: 0.15 } : springs.bouncy}
          >
            {gain.text}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="ui-sr-only" aria-live="polite">
        {gain?.text ?? ''}
      </span>
    </motion.button>
  )
}
