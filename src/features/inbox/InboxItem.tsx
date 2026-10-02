// Item da Caixa. Fechado: título + metadados (+ "Reagendar" 1 toque se atrasada).
// Aberto (um por vez): chips de prazo, Da chefe / Urgente, quebrar em passos, Mandar pra Hoje.
import { useId, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, ChevronDown, Crown, ListPlus, Sun, Trash2, Zap } from 'lucide-react'
import { dayKey, type Task } from '@/domain'
import { useTasks } from '@/store'
import { Button, Chip, Glass, springs, toast } from '@/ui'
import { TaskMeta } from '../shared/TaskMeta'
import { DUE_PRESETS, duePresets, presetDue } from './quickDue'

interface Props {
  task: Task
  /** "agora" da tela (um relógio só para a lista inteira) */
  now: Date
  overdue?: boolean
  open: boolean
  onToggle: () => void
  /** Pede à tela pra onde levar o foco depois de uma ação que move/remove o item. */
  requestFocus: (req: FocusRequest) => void
}

/**
 * 'selected': o chip de prazo escolhido (o item muda de grupo e remonta);
 * 'toggle': o próprio item; 'gone': o item sai da Caixa → vizinho.
 */
export type FocusRequest = { id: string; target: 'selected' | 'toggle' | 'gone' }

export function InboxItem({ task, now, overdue, open, onToggle, requestFocus }: Props) {
  const panelId = useId()
  return (
    // layoutId: ao trocar de grupo (outro <ul>) o item remonta; com layoutId ele "voa" até o novo lugar
    <motion.li
      layoutId={`inbox-${task.id}`}
      layout="position"
      transition={springs.smooth}
      data-inbox-id={task.id}
      className="list-none"
    >
      <Glass intensity="thin" radius="lg" tint={task.fromBoss ? 'boss' : 'none'} className="overflow-hidden">
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium break-words">{task.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <TaskMeta task={task} now={now} size="sm" />
                {task.steps.length > 0 && (
                  <span className="text-xs text-text-2">
                    {task.steps.filter((s) => s.done).length}/{task.steps.length} passos
                  </span>
                )}
              </span>
            </span>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={springs.snappy} className="text-text-2">
              <ChevronDown aria-hidden size={18} />
            </motion.span>
          </button>
          {overdue && !open && <RescheduleButton task={task} now={now} requestFocus={requestFocus} />}
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springs.smooth}
            >
              <Triage task={task} now={now} requestFocus={requestFocus} />
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>
    </motion.li>
  )
}

/** Atrasou? Sem culpa: joga pra amanhã com 1 toque (e dá pra desfazer). */
interface ActionProps {
  task: Task
  now: Date
  requestFocus: (req: FocusRequest) => void
}

function RescheduleButton({ task, now, requestFocus }: ActionProps) {
  const tomorrow = DUE_PRESETS.find((p) => p.id === 'tomorrow')!
  return (
    <Button
      variant="glass"
      size="sm"
      icon={<CalendarClock aria-hidden size={14} />}
      aria-label={`Reagendar "${task.title}" para amanhã`}
      onClick={() => {
        const previous = task.due
        requestFocus({ id: task.id, target: 'toggle' })
        useTasks.getState().rescheduleTask(task.id, presetDue(tomorrow, now))
        toast({
          title: 'Foi pra amanhã. Sem culpa 💜',
          action: { label: 'Desfazer', onClick: () => useTasks.getState().rescheduleTask(task.id, previous) },
        })
      }}
    >
      Reagendar
    </Button>
  )
}

function Triage({ task, now, requestFocus }: ActionProps) {
  const [draft, setDraft] = useState('')
  const { rescheduleTask, updateTask, addStep, removeStep, addToToday, removeFromToday } = useTasks.getState()

  function onAddStep(e: FormEvent) {
    e.preventDefault()
    if (addStep(task.id, draft)) setDraft('')
  }

  function setDue(due: string | undefined) {
    requestFocus({ id: task.id, target: due ? 'selected' : 'toggle' })
    rescheduleTask(task.id, due)
  }

  function sendToToday() {
    requestFocus({ id: task.id, target: 'gone' })
    addToToday(task.id)
    toast({ title: 'Foi pra Hoje ☀️', action: { label: 'Desfazer', onClick: () => removeFromToday(task.id) } })
  }

  function remove() {
    const snapshot = task
    requestFocus({ id: task.id, target: 'gone' })
    useTasks.getState().remove(task.id)
    toast({
      title: 'Tarefa apagada',
      action: { label: 'Desfazer', onClick: () => useTasks.getState().restore(snapshot) },
    })
  }

  return (
    <div className="flex flex-col gap-4 border-t border-[var(--separator)] p-3 pt-3">
      <fieldset data-due-chips className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-text-2 uppercase">Prazo</legend>
        <div className="flex flex-wrap gap-1.5">
          {duePresets(now).map(({ preset, label, due }) => (
            <Chip
              key={preset.id}
              selected={!!task.due && dayKey(task.due) === dayKey(due)}
              onClick={() => setDue(due)}
            >
              {label}
            </Chip>
          ))}
          {task.due && <Chip onClick={() => setDue(undefined)}>Sem prazo</Chip>}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-text-2 uppercase">Marcar</legend>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            tone="boss"
            selected={task.fromBoss}
            icon={<Crown aria-hidden size={14} />}
            onClick={() => updateTask(task.id, { fromBoss: !task.fromBoss })}
          >
            Da chefe
          </Chip>
          <Chip
            tone="urgent"
            selected={task.urgent}
            icon={<Zap aria-hidden size={14} />}
            onClick={() => updateTask(task.id, { urgent: !task.urgent })}
          >
            Urgente
          </Chip>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold tracking-wide text-text-2 uppercase">Passos</legend>
        {task.steps.length > 0 && (
          <ol className="flex flex-wrap gap-1.5">
            {task.steps.map((s, i) => (
              <li key={s.id}>
                <Chip
                  size="sm"
                  onRemove={() => removeStep(task.id, s.id)}
                  removeLabel={`Remover passo "${s.title}"`}
                  className={s.done ? 'text-text-2 line-through' : undefined}
                >
                  {i + 1}. {s.title}
                </Chip>
              </li>
            ))}
          </ol>
        )}
        <form onSubmit={onAddStep} className="flex items-center gap-2">
          <ListPlus aria-hidden size={18} className="shrink-0 text-text-2" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={task.steps.length ? 'Próximo passo… (Enter)' : 'Quebrar em passos: o 1º passo é… (Enter)'}
            aria-label={`Adicionar passo a "${task.title}"`}
            className="min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-text-2"
          />
        </form>
      </fieldset>

      <div className="flex items-center gap-2">
        <Button variant="primary" icon={<Sun aria-hidden size={18} />} onClick={sendToToday} className="flex-1">
          Mandar pra Hoje
        </Button>
        <Button
          variant="ghost"
          iconOnly
          aria-label={`Apagar "${task.title}"`}
          icon={<Trash2 aria-hidden size={18} />}
          onClick={remove}
        />
      </div>
    </div>
  )
}
