// Feedback de recompensa padronizado: UM toast discreto (XP + marcos + Desfazer), confete em marcos, som opcional.
import type { Reward } from '@/domain'
import { celebrate, celebrateReward } from '@/lib/confetti'
import { playChime } from '@/lib/sound'
import { useSettings } from '@/store'
import { toast } from '@/ui'

interface AnnounceOptions {
  /** Título do toast; o XP ganho é acrescentado. Ex.: "Feito!" → "Feito! +15 XP" */
  title?: string
  undo?: () => void
  /** A fila zerou: celebração "Tudo limpo" no lugar do confete de marco. */
  allClear?: boolean
}

export function announceReward(reward: Reward | undefined, { title, undo, allClear }: AnnounceOptions = {}) {
  if (!reward) return
  if (allClear) celebrate('allClear')
  else celebrateReward(reward)
  if (useSettings.getState().sound) playChime(reward.leveledUp ? 'level' : 'done')

  // Marcos vão na descrição do mesmo toast — assim o "Desfazer" nunca é empurrado pra fora.
  const milestones = [
    reward.leveledUp && `Nível ${reward.levelAfter}! 🎉`,
    reward.missionCompleted && `Missão cumprida 🎯`,
    ...reward.unlocked.map((a) => `${a.icon} ${a.title}`),
  ].filter(Boolean)
  const description = milestones.length
    ? milestones.join(' · ')
    : reward.breakdown.length > 1
      ? reward.breakdown.join(' · ')
      : undefined

  const xp = `+${reward.xp} XP`
  toast({
    title: title ? `${title} ${xp}` : xp,
    description,
    tone: 'xp',
    action: undo ? { label: 'Desfazer', onClick: undo } : undefined,
  })
}
