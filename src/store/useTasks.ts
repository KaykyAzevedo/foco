import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { dayKey, MAX_MAIN, parseCapture } from '@/domain'
import type { Reward, Step, Task } from '@/domain'
import { uid } from '@/lib/id'
import { useGame } from './useGame'

/** Dados para criar uma tarefa. `ParsedCapture` (saída do parser) é aceito diretamente. */
export interface NewTaskInput {
  title: string
  notes?: string
  due?: string
  estimateMin?: number
  urgent?: boolean
  fromBoss?: boolean
  plannedFor?: string
  isMain?: boolean
  /** títulos dos micro-passos */
  steps?: Array<string | Step>
}

export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt'>>

export interface PlanInput {
  /** até 3 principais (o excedente é ignorado) */
  main: string[]
  /** pequenas */
  extra?: string[]
}

export interface TasksState {
  tasks: Task[]

  /** Cria uma tarefa e devolve-a. */
  add(input: NewTaskInput, now?: Date): Task
  /** Interpreta o texto da captura rápida e cria a tarefa. Texto vazio → undefined. */
  capture(text: string, now?: Date): Task | undefined
  update(id: string, patch: TaskPatch): void
  /** Conclui e devolve a recompensa (XP, nível, conquistas…) para a UI celebrar. */
  complete(id: string, now?: Date): Reward | undefined
  /** Desfaz a conclusão (o XP ganho não é retirado — perdoar falhas; re-concluir depois rende xp 0). */
  uncomplete(id: string): void
  /** "Pular por agora": vai para o fim da fila de hoje, sem punição. */
  skip(id: string, now?: Date): void
  /** Reagendar com 1 toque. `undefined` remove o prazo. */
  reschedule(id: string, due: string | undefined): void
  /** Ritual "Planejar meu dia": substitui o plano de hoje. Devolve a recompensa do ritual. */
  plan(input: PlanInput, now?: Date): Reward
  /** Coloca/retira uma tarefa de "Hoje". */
  addToToday(id: string, now?: Date, isMain?: boolean): void
  removeFromToday(id: string): void
  /** Ordem manual de "Hoje" (ids na ordem desejada). */
  reorder(ids: string[]): void
  /** Alterna um micro-passo. Devolve recompensa quando ele passa a feito (xp 0 se já tinha rendido). */
  toggleStep(taskId: string, stepId: string, now?: Date): Reward | undefined
  addStep(taskId: string, title: string): Step | undefined
  updateStep(taskId: string, stepId: string, title: string): void
  removeStep(taskId: string, stepId: string): void
  remove(id: string): void
  /** Reinsere uma tarefa apagada (Desfazer), com o mesmo id. No-op se o id já existir. */
  restore(task: Task): void
  /** Substitui tudo (usado pelo importar JSON). */
  replaceAll(tasks: Task[]): void

  // ---- aliases com os nomes usados pelas telas ----
  addTask(input: NewTaskInput, now?: Date): Task
  updateTask(id: string, patch: TaskPatch): void
  completeTask(id: string, now?: Date): Reward | undefined
  skipTask(id: string, now?: Date): void
  rescheduleTask(id: string, due: string | undefined): void
  completeStep(taskId: string, stepId: string, now?: Date): Reward | undefined
  planToday(mainIds: string[], smallIds?: string[], now?: Date): Reward
  reorderToday(ids: string[]): void
}

function toStep(s: string | Step): Step {
  return typeof s === 'string' ? { id: uid(), title: s, done: false } : s
}

function mapTask(tasks: Task[], id: string, fn: (t: Task) => Task): Task[] {
  return tasks.map((t) => (t.id === id ? fn(t) : t))
}

export const useTasks = create<TasksState>()(
  persist<TasksState, [], [], { tasks: Task[] }>(
    (set, get) => ({
      tasks: [] as Task[],

      add(input, now = new Date()) {
        const task: Task = {
          id: uid(),
          title: input.title.trim(),
          notes: input.notes,
          createdAt: now.toISOString(),
          due: input.due,
          estimateMin: input.estimateMin,
          urgent: input.urgent ?? false,
          fromBoss: input.fromBoss ?? false,
          plannedFor: input.plannedFor,
          isMain: input.isMain,
          steps: (input.steps ?? []).map(toStep),
        }
        set((s) => ({ tasks: [...s.tasks, task] }))
        return task
      },

      capture(text, now = new Date()) {
        if (!text.trim()) return undefined
        return get().add(parseCapture(text, now), now)
      },

      update(id, patch) {
        set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, ...patch })) }))
      },

      complete(id, now = new Date()): Reward | undefined {
        const current = get().tasks.find((t) => t.id === id)
        if (!current || current.doneAt) return undefined
        const repeat = current.rewardedAt != null
        const done: Task = {
          ...current,
          doneAt: now.toISOString(),
          skippedAt: undefined,
          rewardedAt: current.rewardedAt ?? now.toISOString(),
        }
        const tasks = mapTask(get().tasks, id, () => done)
        set({ tasks })
        // Feito → Desfazer → Feito não paga de novo (anti-farm), mas a UI recebe um Reward com xp 0
        if (repeat) return useGame.getState().repeated('task', now)
        return useGame.getState().taskCompleted(done, tasks, now)
      },

      uncomplete(id) {
        set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, doneAt: undefined })) }))
      },

      skip(id, now = new Date()) {
        set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, skippedAt: now.toISOString() })) }))
      },

      reschedule(id, due) {
        set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, due, skippedAt: undefined })) }))
      },

      plan({ main, extra = [] }, now = new Date()): Reward {
        const today = dayKey(now)
        const mains = main.slice(0, MAX_MAIN)
        const extras = extra.filter((id) => !mains.includes(id))
        const ordered = [...mains, ...extras]
        set((s) => ({
          tasks: s.tasks.map((t) => {
            const i = ordered.indexOf(t.id)
            if (i >= 0) return { ...t, plannedFor: today, isMain: i < mains.length, order: i }
            if (t.plannedFor === today && !t.doneAt) return { ...t, plannedFor: undefined, isMain: undefined, order: undefined }
            return t
          }),
        }))
        return useGame.getState().dayPlanned(get().tasks, now)
      },

      addToToday(id, now = new Date(), isMain = false) {
        const today = dayKey(now)
        const tasks = get().tasks
        const mainsToday = tasks.filter((t) => t.plannedFor === today && t.isMain && t.id !== id).length
        const maxOrder = Math.max(-1, ...tasks.filter((t) => t.plannedFor === today).map((t) => t.order ?? -1))
        set({
          tasks: mapTask(tasks, id, (t) => ({
            ...t,
            plannedFor: today,
            isMain: isMain && mainsToday < MAX_MAIN,
            order: maxOrder + 1,
          })),
        })
      },

      removeFromToday(id) {
        set((s) => ({
          tasks: mapTask(s.tasks, id, (t) => ({ ...t, plannedFor: undefined, isMain: undefined, order: undefined })),
        }))
      },

      reorder(ids) {
        set((s) => ({
          tasks: s.tasks.map((t) => {
            const i = ids.indexOf(t.id)
            return i >= 0 ? { ...t, order: i } : t
          }),
        }))
      },

      toggleStep(taskId, stepId, now = new Date()): Reward | undefined {
        const task = get().tasks.find((t) => t.id === taskId)
        const step = task?.steps.find((st) => st.id === stepId)
        if (!task || !step) return undefined
        const nowDone = !step.done
        const repeat = step.rewarded === true
        const tasks = mapTask(get().tasks, taskId, (t) => ({
          ...t,
          steps: t.steps.map((st) =>
            st.id === stepId ? { ...st, done: nowDone, rewarded: st.rewarded || nowDone || undefined } : st,
          ),
        }))
        set({ tasks })
        if (!nowDone) return undefined
        return repeat ? useGame.getState().repeated('step', now) : useGame.getState().stepCompleted(tasks, now)
      },

      addStep(taskId, title) {
        if (!title.trim() || !get().tasks.some((t) => t.id === taskId)) return undefined
        const step: Step = { id: uid(), title: title.trim(), done: false }
        set((s) => ({ tasks: mapTask(s.tasks, taskId, (t) => ({ ...t, steps: [...t.steps, step] })) }))
        return step
      },

      updateStep(taskId, stepId, title) {
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({
            ...t,
            steps: t.steps.map((st) => (st.id === stepId ? { ...st, title } : st)),
          })),
        }))
      },

      removeStep(taskId, stepId) {
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({ ...t, steps: t.steps.filter((st) => st.id !== stepId) })),
        }))
      },

      remove(id) {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      },

      restore(task) {
        if (get().tasks.some((t) => t.id === task.id)) return
        set((s) => ({ tasks: [...s.tasks, task] }))
      },

      replaceAll(tasks) {
        set({ tasks })
      },

      addTask: (input, now) => get().add(input, now),
      updateTask: (id, patch) => get().update(id, patch),
      completeTask: (id, now) => get().complete(id, now),
      skipTask: (id, now) => get().skip(id, now),
      rescheduleTask: (id, due) => get().reschedule(id, due),
      completeStep: (taskId, stepId, now) => get().toggleStep(taskId, stepId, now),
      planToday: (mainIds, smallIds = [], now) => get().plan({ main: mainIds, extra: smallIds }, now),
      reorderToday: (ids) => get().reorder(ids),
    }),
    {
      name: 'foco:tasks',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tasks: s.tasks }),
    },
  ),
)
