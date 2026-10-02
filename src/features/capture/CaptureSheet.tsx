// Captura rápida: input único com preview dos chips detectados (parser PT-BR do Atlas).
// Enter salva e fecha · Shift+Enter salva e continua · Esc / arrastar fecha sem salvar.
import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, Crown, Timer, Zap } from 'lucide-react'
import { parseCapture, type CaptureChipKind } from '@/domain'
import { useTasks } from '@/store'
import { Button, Chip, popIn, Sheet, toast, type ChipTone } from '@/ui'

interface Props {
  open: boolean
  onClose: () => void
}

const CHIP_STYLE: Record<CaptureChipKind, { tone: ChipTone; icon: ReactNode }> = {
  due: { tone: 'calm', icon: <CalendarClock aria-hidden size={14} /> },
  urgent: { tone: 'urgent', icon: <Zap aria-hidden size={14} /> },
  boss: { tone: 'boss', icon: <Crown aria-hidden size={14} /> },
  estimate: { tone: 'neutral', icon: <Timer aria-hidden size={14} /> },
}

export function CaptureSheet({ open, onClose }: Props) {
  const [text, setText] = useState('')
  const parsed = useMemo(() => (text.trim() ? parseCapture(text, new Date()) : undefined), [text])

  function close() {
    setText('')
    onClose()
  }

  function save(keepOpen: boolean) {
    const task = useTasks.getState().capture(text)
    if (!task) return
    toast.success({ title: 'Capturado ✓', description: task.title })
    setText('')
    if (!keepOpen) onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      aria-label="Captura rápida"
      footer={
        <Button variant="primary" fullWidth disabled={!parsed?.title} onClick={() => save(false)}>
          Capturar
        </Button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save(false)
        }}
        className="flex flex-col gap-3"
      >
        <input
          data-autofocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              save(true)
            }
          }}
          placeholder="O que está na sua cabeça?"
          aria-label="Nova tarefa"
          aria-describedby="capture-hint"
          enterKeyHint="done"
          autoComplete="off"
          className="w-full bg-transparent py-2 text-xl outline-none placeholder:text-text-2"
        />

        <div className="flex min-h-7 flex-wrap gap-2" aria-live="polite">
          <AnimatePresence mode="popLayout">
            {parsed?.chips.map((chip) => (
              <motion.span key={chip.kind} layout variants={popIn} initial="hidden" animate="show" exit="exit">
                <Chip size="sm" tone={CHIP_STYLE[chip.kind].tone} icon={CHIP_STYLE[chip.kind].icon}>
                  {chip.label}
                </Chip>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        <p id="capture-hint" className="text-xs text-text-2">
          Dica: <kbd>amanhã 15h</kbd> · <kbd>!</kbd> urgente · <kbd>#chefe</kbd> · <kbd>~15m</kbd>. Enter salva,
          Shift+Enter salva e continua.
        </p>
      </form>
    </Sheet>
  )
}
