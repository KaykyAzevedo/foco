// Folha de gamificação (aberta pelo XPOrb): nível, XP, sequência + escudo, combo, missão, conquistas.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, animate, motion, useIsPresent, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { Flame, Lock, Shield, Target, Trophy, X, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { COMBO_WINDOW_MS, comboMultiplier, ptBR, type Achievement } from '@/domain'
import { useNow } from '@/lib/useNow'
import { useGame, useGameSummary } from '@/store'
import { Button, Chip, Glass, ProgressRing, Sheet, fadeUp, springs, stagger } from '@/ui'
import './game.css'

interface Props {
  open: boolean
  onClose: () => void
}

type Badge = Achievement & { unlockedAt?: string }

/** Matiz estável por conquista (para o gradiente do badge). */
function hueOf(id: string): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

/** Número que sobe com spring ao abrir. */
function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const mv = useMotionValue(reduced ? value : 0)
  const shown = useTransform(mv, (v) => Math.round(v).toLocaleString('pt-BR'))
  useEffect(() => {
    if (reduced) {
      mv.set(value)
      return
    }
    const c = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [value, reduced, mv])
  return <motion.span>{shown}</motion.span>
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export function GameSheet({ open, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Seu progresso">
      <GameContent />
    </Sheet>
  )
}

function GameContent() {
  const game = useGameSummary()
  const comboLastAt = useGame((s) => s.combo.lastAt)
  const now = useNow(15_000)
  const reduced = useReducedMotion()
  const [detail, setDetail] = useState<Badge | null>(null)
  const lastBadge = useRef<HTMLButtonElement | null>(null)

  const { level } = game
  const toNext = Math.max(0, level.needed - level.current)
  const unlocked = game.achievements.filter((a) => a.unlockedAt).length
  // desbloqueadas primeiro, na ordem em que foram conquistadas
  const badges = [...game.achievements].sort((a, b) => {
    if (!!a.unlockedAt !== !!b.unlockedAt) return a.unlockedAt ? -1 : 1
    return (a.unlockedAt ?? '').localeCompare(b.unlockedAt ?? '')
  })

  const multiplier = comboMultiplier(game.combo)
  const comboLeftMin =
    game.combo > 0 && comboLastAt
      ? Math.max(1, Math.ceil((new Date(comboLastAt).getTime() + COMBO_WINDOW_MS - now.getTime()) / 60_000))
      : 0

  const mission = game.mission
  const missionPct = mission.target > 0 ? mission.progress / mission.target : 0

  const closeDetail = () => {
    setDetail(null)
    requestAnimationFrame(() => lastBadge.current?.focus())
  }

  return (
    <>
      <motion.div className="game" variants={stagger(0.07)} initial="hidden" animate="show" inert={detail != null}>
        {/* ---------- Nível ---------- */}
        <motion.section className="game-hero" variants={fadeUp} aria-label="Nível">
          <div className="game-hero-orb">
            <div className="game-halo" aria-hidden />
            <ProgressRing
              progress={level.progress}
              size={156}
              strokeWidth={11}
              tone="xp"
              label={`Progresso do nível ${level.level}`}
              valueText={`${level.current} de ${level.needed} XP`}
            />
            <motion.span
              className="ui-xporb-core game-core"
              style={{ width: 112, height: 112 }}
              aria-hidden
              initial={reduced ? false : { scale: 0.6, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={springs.bouncy}
            >
              {level.level}
            </motion.span>
          </div>
          <div>
            <h3 className="game-level-title">Nível {level.level}</h3>
            <p className="game-level-sub">
              <CountUp value={level.current} /> / {level.needed} XP · faltam {toNext} para o nível {level.level + 1}
            </p>
          </div>
          <Chip tone="neutral" size="sm" icon={<Trophy aria-hidden />}>
            {game.xp.toLocaleString('pt-BR')} XP no total
          </Chip>
        </motion.section>

        {/* ---------- Sequência · Escudo · Combo ---------- */}
        <motion.section variants={fadeUp} aria-label="Ritmo">
          <div className="game-stats">
            <Glass intensity="thin" radius="lg" elevation="flat" className="game-stat">
              <span
                className="game-stat-icon"
                style={{ background: 'linear-gradient(135deg,#ffb347,#ff5e3a)', '--_c': '#ff5e3a' } as CSSProperties}
                aria-hidden
              >
                <Flame fill="currentColor" />
              </span>
              <span className="game-stat-value">
                {game.streak}
                <small>{game.streak === 1 ? 'dia' : 'dias'}</small>
              </span>
              <span className="game-stat-label">Sequência</span>
              {game.streakAtRisk ? (
                <span className="game-stat-hint" data-tone="soon">
                  Conclua 1 hoje pra manter
                </span>
              ) : (
                <span className="game-stat-hint">Recorde: {plural(game.bestStreak, 'dia', 'dias')}</span>
              )}
            </Glass>

            <Glass intensity="thin" radius="lg" elevation="flat" className="game-stat">
              <span
                className="game-stat-icon"
                style={{ background: 'linear-gradient(135deg,#6fb7ff,#3a6bff)', '--_c': '#3a6bff' } as CSSProperties}
                aria-hidden
              >
                <Shield fill="currentColor" />
              </span>
              <span className="game-stat-value" style={{ fontSize: 'var(--text-lg)', lineHeight: '24px' }}>
                {game.shields > 0 ? 'Pronto' : 'Usado'}
              </span>
              <span className="game-stat-label">Escudo</span>
              <span className="game-stat-hint">
                {game.shields > 0 ? 'Protege 1 dia perdido' : 'Recarrega na segunda'}
              </span>
            </Glass>

            <Glass intensity="thin" radius="lg" elevation="flat" className="game-stat">
              <span
                className="game-stat-icon"
                style={{ background: 'linear-gradient(135deg,#ffe066,#ffaa00)', '--_c': '#ffaa00' } as CSSProperties}
                aria-hidden
              >
                <Zap fill="currentColor" />
              </span>
              <span className="game-stat-value">
                ×{multiplier.toLocaleString('pt-BR')}
              </span>
              <span className="game-stat-label">Combo</span>
              <span className="game-stat-hint">
                {game.combo > 0 ? `Conclua outra em ${comboLeftMin} min` : 'Conclua 2 em 30 min'}
              </span>
            </Glass>
          </div>
        </motion.section>

        {/* ---------- Missão ---------- */}
        <motion.section variants={fadeUp} aria-label="Missão do dia">
          <div className="game-section-head">
            <h3>Missão do dia</h3>
          </div>
          <Glass tint={mission.done ? 'calm' : 'accent'} radius="lg" className="game-mission" data-done={mission.done}>
            <span className="game-mission-icon" aria-hidden>
              <Target />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="game-mission-title">{mission.mission.title}</div>
              <div
                className="game-bar"
                role="progressbar"
                aria-label="Progresso da missão"
                aria-valuemin={0}
                aria-valuemax={mission.target}
                aria-valuenow={mission.progress}
              >
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: missionPct }} transition={{ ...springs.gentle, delay: 0.25 }} />
              </div>
              <div className="game-mission-meta">
                {mission.done ? 'Missão cumprida! 🎯' : `${mission.progress} de ${mission.target}`}
              </div>
            </div>
            <Chip tone={mission.done ? 'calm' : 'accent'} size="sm">
              +{mission.mission.rewardXp} XP
            </Chip>
          </Glass>
        </motion.section>

        {/* ---------- Conquistas ---------- */}
        <motion.section variants={fadeUp} aria-label="Conquistas">
          <div className="game-section-head">
            <h3>Conquistas</h3>
            <span>
              {unlocked} de {game.achievements.length}
            </span>
          </div>
          <motion.div className="game-badges" variants={stagger(0.035)}>
            {badges.map((b) => {
              const isUnlocked = Boolean(b.unlockedAt)
              return (
                <motion.button
                  key={b.id}
                  type="button"
                  layoutId={`badge-${b.id}`}
                  className="game-badge"
                  data-unlocked={isUnlocked}
                  style={{ '--_h': hueOf(b.id) } as CSSProperties}
                  aria-label={`${b.title}: ${isUnlocked ? 'desbloqueada' : 'bloqueada'}. Ver detalhes`}
                  aria-haspopup="dialog"
                  variants={{ hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1, transition: springs.bouncy } }}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ y: -2 }}
                  onClick={(e) => {
                    lastBadge.current = e.currentTarget
                    setDetail(b)
                  }}
                >
                  <span className="game-badge-emoji" aria-hidden>
                    {b.icon}
                  </span>
                  {!isUnlocked && (
                    <>
                      <span className="game-badge-frost" aria-hidden />
                      <span className="game-badge-lock" aria-hidden>
                        <Lock strokeWidth={2.6} />
                      </span>
                    </>
                  )}
                  <span className="game-badge-title" aria-hidden>
                    {b.title}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {detail && <BadgeDetail key={detail.id} badge={detail} onClose={closeDetail} />}
      </AnimatePresence>
    </>
  )
}

function BadgeDetail({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const isUnlocked = Boolean(badge.unlockedAt)
  const present = useIsPresent()
  useEffect(() => {
    const id = requestAnimationFrame(() => closeRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  // Esc fecha só o detalhe: captura em window roda antes do useFocusTrap da folha (document)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    if (!present) return // saindo (animação de saída): o próximo Esc já é da folha
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [present])

  return (
    <>
      <motion.div
        className="game-detail-scrim"
        aria-hidden
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <div className="game-detail-wrap">
        <Glass
          layoutId={`badge-${badge.id}`}
          intensity="thick"
          radius="xl"
          className="game-detail game-badge"
          data-unlocked={isUnlocked}
          style={{ '--_h': hueOf(badge.id), aspectRatio: 'auto', cursor: 'default' } as CSSProperties}
          role="dialog"
          aria-label={badge.title}
          transition={springs.smooth}
        >
          <span className="game-badge-emoji" aria-hidden>
            {badge.icon}
          </span>
          {!isUnlocked && <span className="game-badge-frost" aria-hidden />}
          <motion.div
            style={{ position: 'relative', zIndex: 2, display: 'grid', gap: 8, justifyItems: 'center' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { ...springs.smooth, delay: 0.1 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <h4>{badge.title}</h4>
            <p>{badge.description}</p>
            {isUnlocked ? (
              <Chip tone="calm" size="sm">
                Desbloqueada em {format(new Date(badge.unlockedAt!), "d 'de' MMM", { locale: ptBR })}
              </Chip>
            ) : (
              <Chip tone="neutral" size="sm" icon={<Lock aria-hidden />}>
                Ainda bloqueada
              </Chip>
            )}
            <Button ref={closeRef} variant="glass" size="sm" icon={<X aria-hidden />} onClick={onClose} style={{ marginTop: 6 }}>
              Fechar
            </Button>
          </motion.div>
        </Glass>
      </div>
    </>
  )
}
