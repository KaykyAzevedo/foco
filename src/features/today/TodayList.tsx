// Lista curta de Hoje: arrastar pela alça (ou ↑/↓ com a alça focada) reordena; checkbox conclui com XP;
// ▶ abre o Modo Foco na tarefa.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, Reorder, useDragControls } from 'motion/react'
import { GripVertical, Play, Star } from 'lucide-react'
import { todayTasks, type Task } from '@/domain'
import { useNow } from '@/lib/useNow'
import { useTasks } from '@/store'
import { Button, Checkbox, Glass, springs } from '@/ui'
import { announceReward } from '../reward'
import { TaskMeta } from '../shared/TaskMeta'

interface Props {
  tasks: Task[]
  onStartFocus: (taskId: string) => void
  /** a lista esvaziou pela conclusão do último item (o pai decide pra onde vai o foco) */
  onEmptied?: () => void
}

export function TodayList({ tasks, onStartFocus, onEmptied }: Props) {
  const now = useNow()
  const listRef = useRef<HTMLOListElement>(null)
  // depois de concluir, o foco vai pro checkbox vizinho (o item concluído sai da lista)
  const [focusId, setFocusId] = useState<string>()
  // posição anunciada ao mover com ↑/↓ (o aria-label da alça não é relido)
  const [announce, setAnnounce] = useState('')
  // Ordem local durante o arraste; ressincroniza quando a lista do store muda.
  const storeKey = tasks.map((t) => t.id).join('|')
  const [local, setLocal] = useState({ key: storeKey, ids: tasks.map((t) => t.id) })
  if (local.key !== storeKey) setLocal({ key: storeKey, ids: tasks.map((t) => t.id) })
  const idsRef = useRef(local.ids)
  idsRef.current = local.ids

  const byId = new Map(tasks.map((t) => [t.id, t]))
  const ordered = local.ids.map((id) => byId.get(id)).filter((t): t is Task => !!t)

  function commit(ids: string[]) {
    useTasks.getState().reorderToday(ids)
  }

  function move(id: string, delta: number) {
    const ids = [...idsRef.current]
    const i = ids.indexOf(id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setLocal((l) => ({ ...l, ids }))
    commit(ids)
    const title = byId.get(id)?.title ?? ''
    setAnnounce(`"${title}" movida para a posição ${j + 1} de ${ids.length}`)
  }

  function complete(t: Task) {
    const ids = idsRef.current
    const i = ids.indexOf(t.id)
    const neighbor = ids[i + 1] ?? ids[i - 1]
    setFocusId(neighbor)
    if (!neighbor) onEmptied?.()
    const { completeTask, uncomplete } = useTasks.getState()
    const reward = completeTask(t.id)
    const allClear = todayTasks(useTasks.getState().tasks, new Date()).length === 0
    announceReward(reward, { title: 'Feito!', undo: () => uncomplete(t.id), allClear })
  }

  useEffect(() => {
    if (!focusId) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-task-id="${focusId}"] [role="checkbox"]`)
      ?.focus({ preventScroll: true })
    setFocusId(undefined)
  }, [focusId, storeKey])

  return (
    <>
      <p role="status" className="sr-only">
        {announce}
      </p>
      <Reorder.Group
        ref={listRef}
        as="ol"
        axis="y"
        values={local.ids}
        onReorder={(ids: string[]) => setLocal((l) => ({ ...l, ids }))}
        aria-label="Tarefas de hoje"
        className="flex flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {ordered.map((t, i) => (
            <TodayItem
              key={t.id}
              task={t}
              now={now}
              position={i + 1}
              count={ordered.length}
              onDragEnd={() => commit(idsRef.current)}
              onMove={(delta) => move(t.id, delta)}
              onComplete={() => complete(t)}
              onFocus={() => onStartFocus(t.id)}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </>
  )
}

interface ItemProps {
  task: Task
  now: Date
  position: number
  count: number
  onDragEnd: () => void
  onMove: (delta: number) => void
  onComplete: () => void
  onFocus: () => void
}

function TodayItem({ task, now, position, count, onDragEnd, onMove, onComplete, onFocus }: ItemProps) {
  const controls = useDragControls()

  function onHandleKey(e: KeyboardEvent) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      onMove(e.key === 'ArrowUp' ? -1 : 1)
    }
  }

  return (
    <Reorder.Item
      value={task.id}
      data-task-id={task.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: springs.snappy }}
      whileDrag={{ scale: 1.03 }}
      transition={springs.smooth}
      className="relative list-none"
    >
      <Glass intensity="thin" radius="lg" tint={task.isMain ? 'accent' : 'none'} className="flex items-center gap-2 p-3">
        <button
          type="button"
          aria-label={`Mover "${task.title}" (posição ${position} de ${count}; use as setas ↑ ↓)`}
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={onHandleKey}
          className="-ml-1 cursor-grab touch-none rounded-md p-1 text-text-2 active:cursor-grabbing"
        >
          <GripVertical aria-hidden size={18} />
        </button>
        <Checkbox checked={false} onChange={(c) => c && onComplete()} aria-label={`Concluir "${task.title}"`} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-medium break-words">
            {task.isMain && (
              <>
                <Star aria-hidden size={14} className="shrink-0 fill-current text-accent" />
                <span className="sr-only">Principal: </span>
              </>
            )}
            {task.title}
          </p>
          <TaskMeta task={task} now={now} size="sm" className="mt-1" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={`Focar em "${task.title}"`}
          icon={<Play aria-hidden size={16} />}
          onClick={onFocus}
        />
      </Glass>
    </Reorder.Item>
  )
}
