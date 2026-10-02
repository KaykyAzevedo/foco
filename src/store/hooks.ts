// Hooks derivados prontos para as telas. Todos recalculam quando as tarefas mudam
// ou quando o relógio (useNow) avança.
import { useMemo } from 'react'
import {
  activeCombo,
  allAchievements,
  currentStreak,
  dayKey,
  dayProgress,
  inboxGroups,
  isDayPlanned,
  levelFromXp,
  missionProgress,
  morningSummary,
  nextTask,
  planningCandidates,
  shieldsAvailable,
  streakAtRisk,
  todayTasks,
} from '@/domain'
import { useNow } from '@/lib/useNow'
import { useGame } from './useGame'
import { useTasks } from './useTasks'

/** Próxima tarefa (tela Agora). */
export function useNextTask(now?: Date) {
  const tasks = useTasks((s) => s.tasks)
  const tick = useNow()
  const at = now ?? tick
  return useMemo(() => nextTask(tasks, at), [tasks, at])
}

/** Lista de Hoje + progresso do dia. */
export function useToday(now?: Date) {
  const tasks = useTasks((s) => s.tasks)
  const tick = useNow()
  const at = now ?? tick
  return useMemo(() => {
    const day = dayKey(at)
    return {
      tasks: todayTasks(tasks, at, day),
      progress: dayProgress(tasks, day),
      planned: isDayPlanned(tasks, at),
      candidates: planningCandidates(tasks, at),
    }
  }, [tasks, at])
}

/** Caixa agrupada: overdue · thisWeek · later · noDate. */
export function useInbox(now?: Date) {
  const tasks = useTasks((s) => s.tasks)
  const tick = useNow()
  const at = now ?? tick
  return useMemo(() => inboxGroups(tasks, at), [tasks, at])
}

export function useMorningSummary(now?: Date) {
  const tasks = useTasks((s) => s.tasks)
  const tick = useNow()
  const at = now ?? tick
  return useMemo(() => morningSummary(tasks, at), [tasks, at])
}

/** Resumo do jogo para o XP orb e a folha de detalhes. */
export function useGameSummary(now?: Date) {
  const xp = useGame((s) => s.xp)
  const streak = useGame((s) => s.streak)
  const combo = useGame((s) => s.combo)
  const today = useGame((s) => s.today)
  const unlockedMap = useGame((s) => s.achievements)
  const tasks = useTasks((s) => s.tasks)
  const tick = useNow()
  const at = now ?? tick
  return useMemo(() => {
    const day = dayKey(at)
    const focusSessionsToday = today.day === day ? today.focusSessions : 0
    return {
      xp,
      level: levelFromXp(xp),
      streak: currentStreak(streak, day),
      bestStreak: streak.best,
      streakAtRisk: streakAtRisk(streak, day),
      shields: shieldsAvailable(streak, day),
      combo: activeCombo(combo, at),
      mission: missionProgress({ tasks, day, focusSessionsToday }),
      achievements: allAchievements().map((a) => ({ ...a, unlockedAt: unlockedMap[a.id] })),
    }
  }, [xp, streak, combo, today, unlockedMap, tasks, at])
}
