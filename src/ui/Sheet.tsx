import { useId, useRef, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { Glass } from './Glass'
import { Button } from './Button'
import { springs } from './motion'
import { useFocusTrap } from './useFocusTrap'

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Título no cabeçalho (também vira o nome acessível do diálogo). */
  title?: ReactNode
  /** Nome acessível quando não há `title` visível. */
  'aria-label'?: string
  children: ReactNode
  /** Mostra botão "Fechar" (×) no cabeçalho. Padrão: true quando há título. */
  showClose?: boolean
  /** Rodapé fixo (ex.: botão de ação principal). */
  footer?: ReactNode
  className?: string
}

/**
 * Bottom sheet de vidro, arrastável pela alça/cabeçalho (puxe para baixo para fechar).
 * Diálogo modal: foco preso, Esc fecha, devolve o foco ao fechar, trava o scroll do body.
 */
export function Sheet({ open, onClose, title, children, showClose, footer, className, ...aria }: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const controls = useDragControls()
  const reduced = useReducedMotion()
  useFocusTrap(panelRef, open, { onEscape: onClose })

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose()
  }

  const close = showClose ?? Boolean(title)
  const startDrag = (e: PointerEvent) => controls.start(e)

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="ui-sheet-scrim"
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <Glass
            key="sheet"
            ref={panelRef}
            intensity="thick"
            radius="xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : aria['aria-label']}
            tabIndex={-1}
            className={clsx('ui-sheet', className)}
            initial={reduced ? { opacity: 0 } : { y: '105%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '105%' }}
            transition={reduced ? { duration: 0.2 } : springs.smooth}
            drag={reduced ? false : 'y'}
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 0.9 }}
            onDragEnd={onDragEnd}
          >
            <div className="ui-sheet-handle-area" onPointerDown={startDrag} aria-hidden>
              <div className="ui-sheet-handle" />
            </div>
            {(title || close) && (
              <div className="ui-sheet-header" onPointerDown={startDrag}>
                {title ? (
                  <h2 id={titleId} className="ui-sheet-title">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                {close && (
                  <Button
                    variant="glass"
                    size="sm"
                    iconOnly
                    aria-label="Fechar"
                    icon={<X aria-hidden />}
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            )}
            <div className="ui-sheet-body">{children}</div>
            {footer && <div style={{ padding: '0 20px 20px', flex: 'none' }}>{footer}</div>}
          </Glass>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
