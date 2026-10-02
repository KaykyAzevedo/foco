// Agora — UMA tarefa, a próxima (nextTask). Ação primária: Começar → Modo Foco.
// Feito → XP + Desfazer; Pular por agora → fim da fila de hoje, sem punição.
import { useEffect, useRef, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { Check, Crown, Footprints, Play, SkipForward, Timer, Zap } from 'lucide-react'
import { formatEstimate, nextTask, urgencyOf, type Task } from '@/domain'
import { useNow } from '@/lib/useNow'
import { useNextTask, useTasks } from '@/store'
import { Button, Chip, Countdown, fade, Glass, springs, toast } from '@/ui'
import { announceReward } from '../game/reward'

/** Como o card saiu: concluído, pulado, ou trocado por outro motivo (ex.: captura urgente). */
type Exit = 'done' | 'skip' | 'replace'

interface Props {
  onStartFocus: (taskId: string) => void
  onCapture: () => void
}

export function NowScreen({ onStartFocus, onCapture }: Props) {
  const task = useNextTask()
  const exitRef = useRef<Exit>('replace')
  // Depois de Feito/Pular o botão some com o card: o foco vai pro botão principal do que entrar.
  const focusNextRef = useRef(false)

  function done(t: Task) {
    // clique duplo enquanto o card sai: já foi concluída, não mexe em foco/animação
    if (useTasks.getState().tasks.find((x) => x.id === t.id)?.doneAt) return
    exitRef.current = 'done'
    focusNextRef.current = true
    const { completeTask, uncomplete } = useTasks.getState()
    const reward = completeTask(t.id)
    const allClear = !nextTask(useTasks.getState().tasks, new Date())
    announceReward(reward, { title: 'Feito!', undo: () => uncomplete(t.id), allClear })
  }

  function skip(t: Task) {
    exitRef.current = 'skip'
    focusNextRef.current = true
    useTasks.getState().skipTask(t.id)
    const stillSame = nextTask(useTasks.getState().tasks, new Date())?.id === t.id
    if (stillSame) focusNextRef.current = false // o card não troca; o foco fica onde está
    toast(stillSame ? 'É a única por agora — sem pressa 🙂' : 'Tudo bem, fica pra depois 👋')
  }

  return (
    <section aria-labelledby="now-title" className="flex flex-col gap-4">
      <h1 id="now-title" className="text-center text-sm font-semibold tracking-widest text-text-2 uppercase">
        Agora
      </h1>
      <AnimatePresence
        mode="popLayout"
        initial={false}
        custom={exitRef.current}
        onExitComplete={() => (exitRef.current = 'replace')}
      >
        {task ? (
          <TaskCard
            key={task.id}
            task={task}
            focusFlag={focusNextRef}
            onStart={() => onStartFocus(task.id)}
            onDone={() => done(task)}
            onSkip={() => skip(task)}
          />
        ) : (
          <EmptyState key="empty" focusFlag={focusNextRef} onCapture={onCapture} />
        )}
      </AnimatePresence>
    </section>
  )
}

/** Ao montar, foca o elemento se a flag estiver ligada e a consome (preserva o teclado após Feito/Pular). */
function useFocusOnMount<T extends HTMLElement>(flag: RefObject<boolean>) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!flag.current) return
    flag.current = false
    ref.current?.focus({ preventScroll: true })
  }, [flag])
  return ref
}

// Saída depende de como o card saiu: "Feito" sobe e some; "Pular" desliza pro lado; troca = só fade.
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, x: 0, rotate: 0, scale: 1, transition: springs.smooth },
  exit: (exit: Exit) =>
    exit === 'skip'
      ? { opacity: 0, x: -120, rotate: -4, transition: springs.snappy }
      : exit === 'done'
        ? { opacity: 0, y: -40, scale: 1.04, transition: springs.snappy }
        : { opacity: 0, transition: fade },
}

const reducedCardVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: fade },
  exit: { opacity: 0, transition: fade },
}

interface CardProps {
  task: Task
  focusFlag: RefObject<boolean>
  onStart: () => void
  onDone: () => void
  onSkip: () => void
}

function TaskCard({ task, focusFlag, onStart, onDone, onSkip }: CardProps) {
  const startRef = useFocusOnMount<HTMLButtonElement>(focusFlag)
  const now = useNow()
  const reduced = useReducedMotion()
  const urgency = urgencyOf(task, now)
  const nextStep = task.steps.find((s) => !s.done)

  return (
    <Glass
      layoutId={`task-${task.id}`}
      intensity="regular"
      radius="xl"
      tint={task.fromBoss ? 'boss' : 'none'}
      variants={reduced ? reducedCardVariants : cardVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col gap-5 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        {task.due && <Countdown due={task.due} urgency={urgency} />}
        {task.fromBoss && (
          <Chip tone="boss" icon={<Crown aria-hidden size={14} />}>
            Pedido da chefe
          </Chip>
        )}
        {task.urgent && (
          <Chip tone="urgent" icon={<Zap aria-hidden size={14} />}>
            Urgente
          </Chip>
        )}
        {task.estimateMin != null && (
          <Chip icon={<Timer aria-hidden size={14} />}>{formatEstimate(task.estimateMin)}</Chip>
        )}
      </div>

      <h2 className="text-3xl font-semibold text-balance break-words sm:text-4xl">{task.title}</h2>

      {nextStep && (
        <p className="flex items-start gap-2 text-text-2">
          <Footprints aria-hidden size={18} className="mt-0.5 shrink-0" />
          <span>
            <span className="sr-only">Primeiro passo: </span>
            {nextStep.title}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button
          ref={startRef}
          variant="primary"
          size="lg" fullWidth icon={<Play aria-hidden size={20} />} onClick={onStart}>
          Começar
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" icon={<Check aria-hidden size={18} />} onClick={onDone}>
            Feito
          </Button>
          <Button variant="ghost" icon={<SkipForward aria-hidden size={18} />} onClick={onSkip}>
            Pular por agora
          </Button>
        </div>
      </div>
    </Glass>
  )
}

const emptyVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: springs.bouncy },
  exit: { opacity: 0, transition: fade },
}

const reducedEmptyVariants: Variants = reducedCardVariants

function EmptyState({ focusFlag, onCapture }: { focusFlag: RefObject<boolean>; onCapture: () => void }) {
  const reduced = useReducedMotion()
  const captureRef = useFocusOnMount<HTMLButtonElement>(focusFlag)
  return (
    <motion.div
      variants={reduced ? reducedEmptyVariants : emptyVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center gap-3 py-10 text-center"
    >
      <p className="text-5xl" aria-hidden>
        ✨
      </p>
      <h2 className="text-3xl font-semibold">Tudo limpo</h2>
      <p className="text-text-2">Nada pendente agora. Aproveita o respiro.</p>
      <Button ref={captureRef} variant="glass" onClick={onCapture} className="mt-2">
        Capturar algo novo
      </Button>
    </motion.div>
  )
}
