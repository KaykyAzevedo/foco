import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  initialGameState,
  onDayPlanned,
  onFocusCompleted,
  onStepCompleted,
  onTaskCompleted,
  rollDay,
} from '@/domain'
import type { GameResult, GameState, Reward, Task } from '@/domain'
import { useTasks } from './useTasks'

export interface GameStore extends GameState {
  /** Última recompensa (para toast/confete). A UI limpa com `clearReward()`. */
  lastReward?: Reward

  /** Chamado por useTasks.complete — normalmente não é chamado pela UI. */
  taskCompleted(task: Task, tasks: readonly Task[], now?: Date): Reward
  /** Chamado por useTasks.toggleStep. */
  stepCompleted(tasks: readonly Task[], now?: Date): Reward
  /** Sessão de foco completa (chamar ao fim do timer). */
  focusCompleted(now?: Date): Reward
  /** Chamado por useTasks.plan. */
  dayPlanned(tasks: readonly Task[], now?: Date): Reward
  /** Troca o registro diário se o dia virou (chamar ao abrir o app é opcional). */
  touchDay(now?: Date): void
  clearReward(): void
  /** Substitui o estado (importar JSON). */
  replace(state: GameState): void
  reset(): void
}

export function gameData(s: GameStore): GameState {
  return {
    xp: s.xp,
    streak: s.streak,
    combo: s.combo,
    stats: s.stats,
    today: s.today,
    achievements: s.achievements,
  }
}

export const useGame = create<GameStore>()(
  persist<GameStore, [], [], GameState>(
    (set, get) => {
      const apply = ({ state, reward }: GameResult): Reward => {
        set({ ...state, lastReward: reward })
        return reward
      }
      return {
        ...initialGameState(new Date()),
        lastReward: undefined,

        taskCompleted: (task, tasks, now = new Date()) => apply(onTaskCompleted(gameData(get()), task, tasks, now)),
        stepCompleted: (tasks, now = new Date()) => apply(onStepCompleted(gameData(get()), tasks, now)),
        focusCompleted: (now = new Date()): Reward =>
          apply(onFocusCompleted(gameData(get()), useTasks.getState().tasks, now)),
        dayPlanned: (tasks, now = new Date()) => apply(onDayPlanned(gameData(get()), tasks, now)),
        touchDay: (now = new Date()) => {
          const next = rollDay(gameData(get()), now)
          if (next.today !== get().today) set({ today: next.today })
        },
        clearReward: () => set({ lastReward: undefined }),
        replace: (state) => set({ ...state, lastReward: undefined }),
        reset: () => set({ ...initialGameState(new Date()), lastReward: undefined }),
      }
    },
    {
      name: 'foco:game',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => gameData(s),
    },
  ),
)
