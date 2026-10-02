// Modo Foco — tela cheia, anel de timer (10/15/25/45), micro-passos; fim: Concluiu? / +5 min / Pausa.
// Aviso gentil após 90 min de foco contínuo. Lógica do timer em ./timer.ts (pura e testada).
import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Coffee, Crown, Pause, Play, Plus, RotateCcw, X } from 'lucide-react'
import { urgencyOf } from '@/domain'
import { useNow } from '@/lib/useNow'
import { FOCUS_OPTIONS, useGame, useSettings, useTasks } from '@/store'
import { Button, Checkbox, Chip, Countdown, Glass, ProgressRing, fadeUp, springs, stagger, useFocusTrap } from '@/ui'
import { announceReward } from '../reward'
import { BREAK_MS, formatClock, formatFocused, initialTimer, spokenRemaining, timerReducer, type Phase } from './timer'
import './focus.css'

interface Props {
  taskId?: string
  onClose: () => void
}

/** Overlay do Modo Foco. Aberto quando `taskId` está definido. */
export function FocusMode({ taskId, onClose }: Props) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>{taskId && <FocusScreen key={taskId} taskId={taskId} onClose={onClose} />}</AnimatePresence>,
    document.body,
  )
}

const STATUS: Record<Phase, string> = {
  idle: 'pronto quando você estiver',
  running: 'restantes',
  paused: 'pausado',
  finished: 'tempo!',
  break: 'pausa · respira',
}

const ANNOUNCE: Partial<Record<Phase, string>> = {
  running: 'Sessão de foco em andamento.',
  paused: 'Sessão pausada.',
  finished: 'Tempo esgotado. Concluiu a tarefa?',
  break: 'Pausa de 5 minutos.',
}

function ringSizeFor(width: number) {
  return Math.max(200, Math.min(300, width - 96))
}

function useRingSize() {
  const [size, setSize] = useState(() => ringSizeFor(typeof window === 'undefined' ? 400 : window.innerWidth))
  useEffect(() => {
    const on = () => setSize(ringSizeFor(window.innerWidth))
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}

/** Mantém a tela acesa enquanto o timer roda (onde houver suporte). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    let cancelled = false
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        if (cancelled) void l.release()
        else lock = l
      })
      .catch(() => {})
    return () => {
      cancelled = true
      lock?.release().catch(() => {})
    }
  }, [active])
}

function FocusScreen({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useTasks((s) => s.tasks.find((t) => t.id === taskId))
  const focusMinutes = useSettings((s) => s.focusMinutes)
  const setFocusMinutes = useSettings((s) => s.setFocusMinutes)
  const [timer, dispatch] = useReducer(timerReducer, focusMinutes, initialTimer)
  const [stepDraft, setStepDraft] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const now = useNow()
  const ringSize = useRingSize()
  const { phase } = timer

  // Esc com o timer rodando só pausa (evita perder a sessão sem querer); o 2º Esc sai.
  const onEscape = () => {
    if (phase === 'running') dispatch({ type: 'pause', now: Date.now() })
    else onClose()
  }
  useFocusTrap(ref, true, { onEscape })
  useWakeLock(phase === 'running')

  // relógio: recalcula a partir de Date.now() (resiste a abas em segundo plano)
  const ticking = phase === 'running' || phase === 'break'
  useEffect(() => {
    if (!ticking) return
    const id = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 250)
    return () => clearInterval(id)
  }, [ticking])

  // sessão completa → XP de foco (uma vez por sessão)
  const rewarded = useRef(0)
  useEffect(() => {
    if (timer.sessions > rewarded.current) {
      rewarded.current = timer.sessions
      announceReward(useGame.getState().focusCompleted(), { title: 'Sessão completa!' })
    }
  }, [timer.sessions])

  // tempo restante no título da aba
  useEffect(() => {
    const original = document.title
    return () => {
      document.title = original
    }
  }, [])
  useEffect(() => {
    if (phase === 'running' || phase === 'paused') document.title = `${formatClock(timer.remainingMs)} · Foco`
    else if (phase === 'break') document.title = `Pausa ${formatClock(timer.remainingMs)} · Foco`
    else if (phase === 'finished') document.title = 'Tempo! · Foco'
  }, [phase, timer.remainingMs])

  // Espaço: começa/pausa/retoma (quando o foco não está num controle)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.('button, input, textarea, [role="checkbox"]')) return
      e.preventDefault()
      const at = Date.now()
      if (phase === 'idle') dispatch({ type: 'start', now: at })
      else if (phase === 'running') dispatch({ type: 'pause', now: at })
      else if (phase === 'paused') dispatch({ type: 'resume', now: at })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  // tarefa sumiu ou foi concluída em outro lugar
  const gone = !task || Boolean(task.doneAt)
  useEffect(() => {
    if (gone) onClose()
  }, [gone, onClose])
  if (!task) return null

  const total = phase === 'break' ? BREAK_MS : timer.totalMs
  const progress = phase === 'idle' ? 1 : phase === 'finished' ? 0 : timer.remainingMs / Math.max(1, total)
  const ringTone = phase === 'break' ? 'calm' : phase === 'finished' ? 'xp' : 'accent'
  const shownMs = phase === 'idle' ? timer.durationMs : timer.remainingMs
  const stepsDone = task.steps.filter((s) => s.done).length
  const at = () => Date.now()

  const completeTask = () => {
    const { completeTask: complete, uncomplete } = useTasks.getState()
    announceReward(complete(task.id), { title: 'Feito!', undo: () => uncomplete(task.id) })
    onClose()
  }

  const toggleStep = (stepId: string) => {
    announceReward(useTasks.getState().toggleStep(task.id, stepId), { title: 'Passo feito!' })
  }

  const addStep = (e: FormEvent) => {
    e.preventDefault()
    const title = stepDraft.trim()
    if (!title) return
    useTasks.getState().addStep(task.id, title)
    setStepDraft('')
  }

  const pickDuration = (min: number) => {
    setFocusMinutes(min)
    dispatch({ type: 'setDuration', minutes: min })
  }

  const breathing = !reduced && (phase === 'running' || phase === 'break')
  const focusedFor = formatFocused(timer.focusedMs)
  const showNudge = timer.nudge && phase !== 'break'
  const announcement = showNudge
    ? `Você está em foco há ${focusedFor}. Que tal uma pausa?`
    : phase === 'paused'
      ? 'Sessão pausada. Esc de novo para sair do foco.'
      : (ANNOUNCE[phase] ?? '')

  return (
    <motion.div
      ref={ref}
      className="focus-screen ui-theme-dark"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={`Modo foco: ${task.title}`}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div className="focus-inner" variants={stagger(0.06)} initial="hidden" animate="show">
        <motion.div className="focus-top" variants={fadeUp}>
          <Button variant="glass" size="sm" iconOnly aria-label="Sair do foco" icon={<X aria-hidden />} onClick={onClose} />
          <span className="focus-eyebrow">
            Modo foco
            {timer.sessions > 0 && (
              <span className="focus-dots" role="img" aria-label={`${timer.sessions} sessões completas`}>
                {Array.from({ length: Math.min(timer.sessions, 6) }, (_, i) => (
                  <span key={i} />
                ))}
              </span>
            )}
          </span>
        </motion.div>

        <motion.div variants={fadeUp} style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          {(task.fromBoss || task.due) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {task.due && <Countdown due={task.due} urgency={urgencyOf(task, now)} />}
              {task.fromBoss && (
                <Chip tone="boss" size="sm" icon={<Crown aria-hidden />}>
                  Pedido da chefe
                </Chip>
              )}
            </div>
          )}
          <h1 className="focus-title">{task.title}</h1>
        </motion.div>

        <AnimatePresence>
          {showNudge && (
            <motion.div
              key="nudge"
              style={{ width: '100%' }}
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={springs.smooth}
            >
              <Glass tint="soon" radius="lg" className="focus-nudge">
                <strong>Você está em foco há {focusedFor} 🌿</strong>
                <p>
                  Que tal 5 minutos de pausa? Água, alongar, olhar pela janela.
                  {phase === 'running' || phase === 'paused' ? ' Sua sessão fica pausada e te espera.' : ''}
                </p>
                <div className="focus-actions" style={{ justifyContent: 'flex-start' }}>
                  <Button size="sm" variant="glass" icon={<Coffee aria-hidden />} onClick={() => dispatch({ type: 'takeBreak', now: at() })}>
                    Fazer pausa
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'dismissNudge' })}>
                    Agora não
                  </Button>
                </div>
              </Glass>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="focus-ring-wrap" variants={fadeUp}>
          <motion.div
            className="focus-glow"
            aria-hidden
            animate={
              breathing
                ? { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }
                : { scale: 1, opacity: phase === 'finished' || phase === 'running' ? 1 : 0.5 }
            }
            transition={breathing ? { duration: 5.5, repeat: Infinity, ease: 'easeInOut' } : springs.gentle}
          />
          <ProgressRing
            progress={progress}
            size={ringSize}
            strokeWidth={Math.round(ringSize / 26)}
            tone={ringTone}
            label={phase === 'break' ? 'Tempo de pausa' : 'Timer de foco'}
            valueText={spokenRemaining(shownMs)}
          >
            <span className="focus-clock">
              <span className="focus-time" aria-hidden>
                {formatClock(shownMs)}
              </span>
              <span className="focus-status">{STATUS[phase]}</span>
            </span>
          </ProgressRing>
        </motion.div>

        <span className="ui-sr-only" aria-live="polite">
          {announcement}
        </span>

        <motion.div variants={fadeUp} style={{ width: '100%', display: 'grid', gap: 16, justifyItems: 'center' }}>
          {phase === 'idle' && (
            <div className="focus-actions" role="group" aria-label="Duração da sessão">
              {FOCUS_OPTIONS.map((m) => (
                <Chip key={m} selected={timer.durationMs === m * 60_000} onClick={() => pickDuration(m)}>
                  {m} min
                </Chip>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={phase}
              style={{ width: '100%', display: 'grid', justifyItems: 'center' }}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={springs.snappy}
            >
              {phase === 'idle' && (
                <Button
                  size="lg"
                  icon={<Play aria-hidden fill="currentColor" />}
                  onClick={() => dispatch({ type: 'start', now: at() })}
                  data-autofocus
                >
                  Começar
                </Button>
              )}
              {phase === 'running' && (
                <div className="focus-actions">
                  <Button size="lg" icon={<Pause aria-hidden fill="currentColor" />} onClick={() => dispatch({ type: 'pause', now: at() })}>
                    Pausar
                  </Button>
                  <Button variant="glass" icon={<Plus aria-hidden />} onClick={() => dispatch({ type: 'extend', now: at() })}>
                    5 min
                  </Button>
                </div>
              )}
              {phase === 'paused' && (
                <div className="focus-actions">
                  <Button size="lg" icon={<Play aria-hidden fill="currentColor" />} onClick={() => dispatch({ type: 'resume', now: at() })}>
                    Retomar
                  </Button>
                  <Button variant="ghost" icon={<RotateCcw aria-hidden />} onClick={() => dispatch({ type: 'restart', now: at() })}>
                    Recomeçar
                  </Button>
                </div>
              )}
              {phase === 'finished' && (
                <Glass radius="xl" tint="accent" className="focus-finish">
                  <h2>Concluiu?</h2>
                  <Button size="lg" fullWidth icon={<Check aria-hidden strokeWidth={3} />} onClick={completeTask}>
                    Concluí a tarefa
                  </Button>
                  <div className="focus-actions">
                    <Button variant="glass" icon={<Plus aria-hidden />} onClick={() => dispatch({ type: 'extend', now: at() })}>
                      5 min
                    </Button>
                    <Button variant="ghost" icon={<Coffee aria-hidden />} onClick={() => dispatch({ type: 'takeBreak', now: at() })}>
                      Pausa
                    </Button>
                  </div>
                </Glass>
              )}
              {phase === 'break' && (
                <Button size="lg" icon={<Play aria-hidden fill="currentColor" />} onClick={() => dispatch({ type: 'endBreak' })}>
                  Voltar ao foco
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div variants={fadeUp} style={{ width: '100%' }}>
          <Glass intensity="thin" radius="lg" className="focus-steps">
            <div className="focus-steps-head">
              <span>Micro-passos</span>
              {task.steps.length > 0 && (
                <span>
                  {stepsDone}/{task.steps.length}
                </span>
              )}
            </div>
            {task.steps.map((st) => (
              <Checkbox key={st.id} checked={st.done} label={st.title} onChange={() => toggleStep(st.id)} />
            ))}
            <form onSubmit={addStep}>
              <input
                className="focus-step-input"
                value={stepDraft}
                onChange={(e) => setStepDraft(e.target.value)}
                placeholder={task.steps.length ? 'Adicionar passo…' : 'Qual o primeiro passo, bem pequeno?'}
                aria-label="Adicionar micro-passo"
                enterKeyHint="done"
              />
            </form>
          </Glass>
        </motion.div>

        {phase !== 'finished' && (
          <motion.div variants={fadeUp}>
            <Button variant="ghost" icon={<Check aria-hidden strokeWidth={3} />} onClick={completeTask}>
              Já terminei a tarefa
            </Button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
