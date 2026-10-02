import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Inbox, Sparkles, Sun } from 'lucide-react'
import { useGameSummary } from '@/store'
import {
  AppBackground,
  TabBar,
  UIProvider,
  useAppliedTheme,
  useSpringTransition,
  XPOrb,
  type TabItem,
} from '@/ui'
import type { Overlay, Tab } from './features/navigation'
import { NowScreen } from './features/now/NowScreen'
import { useMorningSummaryToast } from './features/now/useMorningSummaryToast'
import { TodayScreen } from './features/today/TodayScreen'
import { InboxScreen } from './features/inbox/InboxScreen'
import { CaptureButton } from './features/capture/CaptureButton'
import { CaptureSheet } from './features/capture/CaptureSheet'
import { useCaptureShortcut } from './features/capture/useCaptureShortcut'
import { FocusMode } from './features/focus/FocusMode'
import { GameSheet } from './features/game/GameSheet'

const TABS: TabItem<Tab>[] = [
  { id: 'now', label: 'Agora', icon: <Sparkles aria-hidden size={20} /> },
  { id: 'today', label: 'Hoje', icon: <Sun aria-hidden size={20} /> },
  { id: 'inbox', label: 'Caixa', icon: <Inbox aria-hidden size={20} /> },
]

export default function App() {
  return (
    <UIProvider>
      <Shell />
    </UIProvider>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('now')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const game = useGameSummary()
  const transition = useSpringTransition('smooth')

  const close = useCallback(() => setOverlay(null), [])
  // No modo foco a captura não interrompe a tela cheia.
  const openCapture = useCallback(() => setOverlay((o) => (o?.kind === 'focus' ? o : { kind: 'capture' })), [])

  useAppliedTheme()
  useCaptureShortcut(openCapture)
  useMorningSummaryToast()

  return (
    <div className="min-h-dvh">
      <AppBackground tone={overlay?.kind === 'focus' ? 'focus' : 'default'} />

      <header className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-5 z-30">
        <XPOrb
          level={game.level.level}
          xp={game.level.current}
          xpToNext={game.level.needed}
          announce={false} // o toast de recompensa já anuncia o XP
          onClick={() => setOverlay({ kind: 'game' })}
        />
      </header>

      <main className="mx-auto grid min-h-dvh w-full max-w-lg place-items-center px-4 pt-20 pb-36">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={transition}
            role="tabpanel"
            aria-label={TABS.find((t) => t.id === tab)?.label}
            className="w-full"
          >
            {tab === 'now' && (
              <NowScreen onStartFocus={(taskId) => setOverlay({ kind: 'focus', taskId })} onCapture={openCapture} />
            )}
            {tab === 'today' && <TodayScreen />}
            {tab === 'inbox' && <InboxScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      <CaptureButton onClick={openCapture} />
      <TabBar items={TABS} value={tab} onChange={setTab} aria-label="Navegação principal" />

      <CaptureSheet open={overlay?.kind === 'capture'} onClose={close} />
      <FocusMode taskId={overlay?.kind === 'focus' ? overlay.taskId : undefined} onClose={close} />
      <GameSheet open={overlay?.kind === 'game'} onClose={close} />
    </div>
  )
}
