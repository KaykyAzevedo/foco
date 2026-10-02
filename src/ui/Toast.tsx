import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { AnimatePresence, type PanInfo } from 'motion/react'
import { useMotionReduced } from './reducedMotion'
import { AlertCircle, Check, Sparkles, Zap } from 'lucide-react'
import { Glass } from './Glass'
import { Button } from './Button'
import { springs } from './motion'

export type ToastTone = 'default' | 'success' | 'xp' | 'warning'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  /** Ícone customizado (padrão depende do tom). */
  icon?: ReactNode
  /** Ação rápida, ex.: { label: 'Desfazer', onClick: undo }. */
  action?: { label: string; onClick: () => void }
  /** ms até sumir. Padrão: 3200 (5000 se tiver ação). */
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: number
}

// ---- store minúsculo fora do React: permite chamar toast() de qualquer lugar ----
let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => items

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

function show(input: string | ToastOptions, tone?: ToastTone): number {
  const opts: ToastOptions = typeof input === 'string' ? { title: input } : input
  const id = ++seq
  items = [...items, { tone, ...opts, id }].slice(-3)
  emit()
  return id
}

/**
 * Mostra um aviso flutuante no topo. Requer <Toaster /> montado uma vez (já incluso no <UIProvider>).
 * toast('Capturado ✓') · toast.success('Feito!') · toast.xp('+10 XP') · toast({ title, action })
 */
export const toast = Object.assign((input: string | ToastOptions) => show(input), {
  success: (input: string | ToastOptions) => show(input, 'success'),
  xp: (input: string | ToastOptions) => show(input, 'xp'),
  warning: (input: string | ToastOptions) => show(input, 'warning'),
  dismiss,
  /** Remove todos (útil em testes). */
  clear: () => {
    items = []
    emit()
  },
})

/** Hook de conveniência: const toast = useToast() */
export function useToast() {
  return toast
}

const ICONS: Record<ToastTone, ReactNode> = {
  default: <Sparkles aria-hidden />,
  success: <Check aria-hidden strokeWidth={3} />,
  xp: <Zap aria-hidden fill="currentColor" />,
  warning: <AlertCircle aria-hidden />,
}

function ToastView({ t }: { t: ToastItem }) {
  const reduced = useMotionReduced()
  const duration = t.duration ?? (t.action ? 5000 : 3200)
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), duration)
    return () => clearTimeout(id)
  }, [t.id, duration])

  const tone = t.tone ?? 'default'
  return (
    <Glass
      layout
      intensity="thick"
      radius="full"
      className="ui-toast"
      data-tone={tone}
      data-has-action={Boolean(t.action)}
      role={tone === 'warning' ? 'alert' : 'status'}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.85, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.9, filter: 'blur(4px)' }}
      transition={reduced ? { duration: 0.15 } : springs.bouncy}
      drag={reduced ? false : 'y'}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.8, bottom: 0.1 }}
      onDragEnd={(_: unknown, info: PanInfo) => {
        if (info.offset.y < -30 || info.velocity.y < -300) dismiss(t.id)
      }}
    >
      <span className="ui-toast-icon">{t.icon ?? ICONS[tone]}</span>
      <div className="ui-toast-text">
        <div className="ui-toast-title">{t.title}</div>
        {t.description && <div className="ui-toast-desc">{t.description}</div>}
      </div>
      {t.action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            t.action!.onClick()
            dismiss(t.id)
          }}
        >
          {t.action.label}
        </Button>
      )}
    </Glass>
  )
}

/** Região onde os toasts aparecem. Monte uma vez na raiz (ou use <UIProvider>). */
export function Toaster() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return (
    <div className="ui-toaster" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <ToastView key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
