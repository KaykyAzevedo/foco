// Ritual "Planejar meu dia": candidatas como cartas. Tocar = principal (máx. 3, limite proposital);
// "+ pequena" = extra opcional. Mostra poucas cartas por vez para não virar uma lista gigante.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { Plus, Star } from 'lucide-react'
import { MAX_MAIN, type Task } from '@/domain'
import { useNow } from '@/lib/useNow'
import { useTasks } from '@/store'
import { Button, Chip, fadeUp, Glass, stagger, toast } from '@/ui'
import { announceReward } from '../reward'
import { TaskMeta } from '../shared/TaskMeta'

const PAGE = 6
const BLOCKED_TEXT = 'Já tem 3 principais 💜 Tire uma pra trocar, ou marque esta como pequena.'

interface Props {
  /** cartas: as já planejadas hoje primeiro (replanejar), depois as candidatas */
  tasks: Task[]
  /** seleção inicial (replanejar) */
  initialMain?: string[]
  initialExtra?: string[]
  onDone: () => void
  onCancel?: () => void
}

export function PlanDay({ tasks, initialMain = [], initialExtra = [], onDone, onCancel }: Props) {
  const now = useNow()
  const [main, setMain] = useState<string[]>(initialMain)
  const [extra, setExtra] = useState<string[]>(initialExtra)
  const [limit, setLimit] = useState(PAGE)
  // tentativa de 4ª principal: id + contador (cada toque balança de novo)
  const [blocked, setBlocked] = useState<{ id: string; n: number }>()
  const titleRef = useRef<HTMLHeadingElement>(null)

  // O botão que abriu o ritual desmontou: o foco vem pro título do ritual.
  useEffect(() => titleRef.current?.focus({ preventScroll: true }), [])

  function toggleMain(id: string) {
    if (main.includes(id)) {
      setBlocked(undefined)
      return setMain(main.filter((x) => x !== id))
    }
    if (main.length >= MAX_MAIN) return setBlocked((b) => ({ id, n: (b?.n ?? 0) + 1 }))
    setBlocked(undefined)
    setExtra(extra.filter((x) => x !== id))
    setMain([...main, id])
  }

  function toggleExtra(id: string) {
    setBlocked(undefined)
    setMain(main.filter((x) => x !== id))
    setExtra(extra.includes(id) ? extra.filter((x) => x !== id) : [...extra, id])
  }

  function confirm() {
    const reward = useTasks.getState().planToday(main, extra)
    // Replanejar não rende XP de novo: só confirma, sem "+0 XP".
    if (reward.xp === 0 || reward.repeat) toast('Plano atualizado ✓')
    else announceReward(reward, { title: 'Dia planejado!' })
    onDone()
  }

  const total = main.length + extra.length
  const visible = tasks.slice(0, limit)

  return (
    <section aria-labelledby="plan-title" className="flex flex-col gap-4">
      <header className="text-center">
        <h2 id="plan-title" ref={titleRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Planejar meu dia
        </h2>
        <p className="text-text-2">
          Escolha até <strong>3 principais</strong>. Menos é mais.
        </p>
        <p className="mt-2 text-sm font-semibold tabular-nums" aria-live="polite">
          <Star aria-hidden size={14} className="mr-1 inline align-[-2px]" />
          {main.length}/{MAX_MAIN} principais{extra.length > 0 && ` · ${extra.length} pequenas`}
        </p>
        {/* sempre montado; só o texto muda — leitores anunciam de forma confiável */}
        <p role="status" className="sr-only">
          {blocked ? BLOCKED_TEXT : ''}
        </p>
      </header>

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-text-2">Nada pra planejar ainda. Capture algumas tarefas primeiro.</p>
      ) : (
        <motion.ul variants={stagger(0.04)} initial="hidden" animate="show" className="flex flex-col gap-2">
          {visible.map((t) => (
            <PlanCard
              key={t.id}
              task={t}
              now={now}
              isMain={main.includes(t.id)}
              isExtra={extra.includes(t.id)}
              blockedTick={blocked?.id === t.id ? blocked.n : 0}
              onToggleMain={() => toggleMain(t.id)}
              onToggleExtra={() => toggleExtra(t.id)}
            />
          ))}
        </motion.ul>
      )}

      {tasks.length > limit && (
        <Button variant="ghost" size="sm" onClick={() => setLimit(limit + PAGE)} className="self-center">
          Ver mais {Math.min(PAGE, tasks.length - limit)}
        </Button>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button variant="primary" size="lg" fullWidth disabled={total === 0} onClick={confirm}>
          {total === 0 ? 'Escolha pelo menos 1' : `Fechar o plano (${total})`}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Agora não
          </Button>
        )}
      </div>
    </section>
  )
}

interface CardProps {
  task: Task
  now: Date
  isMain: boolean
  isExtra: boolean
  /** > 0 quando o usuário tentou marcar esta como 4ª principal */
  blockedTick: number
  onToggleMain: () => void
  onToggleExtra: () => void
}

function PlanCard({ task, now, isMain, isExtra, blockedTick, onToggleMain, onToggleExtra }: CardProps) {
  const controls = useAnimationControls()

  // 4ª principal: balança de leve (o aviso aparece embaixo)
  useEffect(() => {
    if (blockedTick > 0) void controls.start({ x: [0, -6, 6, -3, 0], transition: { duration: 0.35, ease: 'easeInOut' } })
  }, [blockedTick, controls])

  return (
    <motion.li variants={fadeUp} layout>
      <motion.div animate={controls}>
        <Glass
          intensity="thin"
          radius="lg"
          tint={isMain ? 'accent' : 'none'}
          interactive
          className="flex items-center gap-3 p-3"
        >
          {/* nome estável; o estado fica no aria-pressed */}
          <button
            type="button"
            aria-pressed={isMain}
            onClick={onToggleMain}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left"
          >
            <Star
              aria-hidden
              size={22}
              className={`shrink-0 transition-colors ${isMain ? 'fill-current text-accent' : 'text-text-2'}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium break-words">{task.title}</span>
              <TaskMeta task={task} now={now} size="sm" className="mt-1" />
            </span>
            <span className="sr-only">, principal</span>
          </button>
          {!isMain && (
            <Chip
              size="sm"
              selected={isExtra}
              onClick={onToggleExtra}
              icon={<Plus aria-hidden size={12} />}
              title="Tarefa pequena, sem compromisso"
            >
              Pequena
            </Chip>
          )}
        </Glass>
      </motion.div>
      <AnimatePresence>
        {blockedTick > 0 && (
          <motion.p
            aria-hidden
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pt-1 text-sm text-text-2"
          >
            {BLOCKED_TEXT}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.li>
  )
}
