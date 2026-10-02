// Caixa — tudo que não está em Hoje: Atrasadas · Esta semana · Depois · Sem data.
// Triagem rápida: tocar num item abre (um por vez); trocar o prazo move o item de grupo com animação
// (layoutId) e o foco do teclado acompanha.
import { useEffect, useRef, useState } from 'react'
import { LayoutGroup, motion } from 'motion/react'
import type { InboxGroups } from '@/domain'
import { useNow } from '@/lib/useNow'
import { useInbox } from '@/store'
import { fadeUp } from '@/ui'
import { InboxItem, type FocusRequest } from './InboxItem'

const GROUPS: { key: keyof InboxGroups; title: string; hint?: string }[] = [
  { key: 'overdue', title: 'Atrasadas', hint: 'Acontece. Reagende com 1 toque.' },
  { key: 'thisWeek', title: 'Esta semana' },
  { key: 'later', title: 'Depois' },
  { key: 'noDate', title: 'Sem data' },
]

export function InboxScreen() {
  const now = useNow()
  const groups = useInbox(now)
  const [openId, setOpenId] = useState<string>()
  const total = GROUPS.reduce((n, g) => n + groups[g.key].length, 0)
  const rootRef = useRef<HTMLElement>(null)
  // Ação que move/remove um item: o foco do teclado é reposto depois do re-render (senão cai no <body>).
  const [pendingFocus, setPendingFocus] = useState<{ id?: string; target: 'selected' | 'toggle' }>()

  function requestFocus({ id, target }: FocusRequest) {
    if (target !== 'gone') return setPendingFocus({ id, target })
    // o item vai sair: mira o vizinho na ordem visual (seguinte, senão o anterior)
    const ids = GROUPS.flatMap((g) => groups[g.key].map((t) => t.id))
    const i = ids.indexOf(id)
    setPendingFocus({ id: ids[i + 1] ?? ids[i - 1], target: 'toggle' })
  }

  useEffect(() => {
    if (!pendingFocus) return
    const root = rootRef.current
    const item = pendingFocus.id ? root?.querySelector(`[data-inbox-id="${pendingFocus.id}"]`) : null
    const el =
      (pendingFocus.target === 'selected' && item?.querySelector<HTMLElement>('[data-due-chips] [aria-pressed="true"]')) ||
      item?.querySelector<HTMLElement>('button[aria-expanded]') ||
      root?.querySelector<HTMLElement>('#inbox-title')
    el?.focus({ preventScroll: true })
    setPendingFocus(undefined)
  }, [pendingFocus, groups])

  return (
    <section ref={rootRef} aria-labelledby="inbox-title" className="flex flex-col gap-5">
      <h1 id="inbox-title" tabIndex={-1} className="text-center outline-none text-sm font-semibold tracking-widest text-text-2 uppercase">
        Caixa
      </h1>

      {total === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-5xl" aria-hidden>
            📭
          </p>
          <h2 className="text-2xl font-semibold">Caixa vazia</h2>
          <p className="text-text-2">Tudo triado. O que surgir, é só capturar (N).</p>
        </motion.div>
      ) : (
        <LayoutGroup>
          {GROUPS.filter((g) => groups[g.key].length > 0).map((g) => (
            <motion.section key={g.key} layout="position" aria-labelledby={`inbox-${g.key}`} className="flex flex-col gap-2">
              <header className="flex items-baseline justify-between px-1">
                <h2 id={`inbox-${g.key}`} className="text-base font-semibold">
                  {g.title} <span className="text-sm font-normal text-text-2 tabular-nums">· {groups[g.key].length}</span>
                </h2>
                {g.hint && <p className="text-xs text-text-2">{g.hint}</p>}
              </header>
              <ul className="flex flex-col gap-2">
                {groups[g.key].map((t) => (
                  <InboxItem
                    key={t.id}
                    task={t}
                    now={now}
                    overdue={g.key === 'overdue'}
                    open={openId === t.id}
                    onToggle={() => setOpenId(openId === t.id ? undefined : t.id)}
                    requestFocus={requestFocus}
                  />
                ))}
              </ul>
            </motion.section>
          ))}
        </LayoutGroup>
      )}
    </section>
  )
}
