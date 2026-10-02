// Folha de gamificação (aberta pelo XPOrb): nível, XP, streak + escudo, combo, missão, conquistas.
// TODO(próxima entrega): layout completo com ProgressRing do nível e grade de conquistas animada.
import { useGameSummary } from '@/store'
import { Sheet } from '@/ui'

interface Props {
  open: boolean
  onClose: () => void
}

export function GameSheet({ open, onClose }: Props) {
  const game = useGameSummary()
  return (
    <Sheet open={open} onClose={onClose} title="Seu progresso">
      <ul className="flex flex-col gap-2 pb-4">
        <li>
          Nível {game.level.level} · {game.level.current}/{game.level.needed} XP
        </li>
        <li>
          🔥 {game.streak} {game.streak === 1 ? 'dia' : 'dias'} seguidos
          {game.shields > 0 && ' · 🛡️ escudo disponível'}
        </li>
        <li>
          🎯 {game.mission.mission.title} ({game.mission.progress}/{game.mission.target})
        </li>
      </ul>
    </Sheet>
  )
}
