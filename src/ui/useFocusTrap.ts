import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export interface FocusTrapOptions {
  /** Chamado com Esc. */
  onEscape?: () => void
  /** Trava o scroll do body enquanto ativo. Padrão: true. */
  lockScroll?: boolean
}

/**
 * Prende o foco dentro de `ref` enquanto `active`: foca o elemento com [data-autofocus] (ou o container),
 * cicla Tab/Shift+Tab, Esc chama onEscape e, ao desativar, devolve o foco para onde estava.
 * Para consumir o Esc antes (camada interna), escute keydown em `window` na captura e chame preventDefault().
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, options: FocusTrapOptions = {}) {
  const opts = useRef(options)
  useEffect(() => {
    opts.current = options
  })

  useEffect(() => {
    if (!active) return
    const previous = document.activeElement as HTMLElement | null
    const lock = opts.current.lockScroll ?? true
    const { overflow } = document.body.style
    if (lock) document.body.style.overflow = 'hidden'

    const raf = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const auto = el.querySelector<HTMLElement>('[autofocus],[data-autofocus]')
      ;(auto ?? el).focus({ preventScroll: true })
    })

    const onKey = (e: KeyboardEvent) => {
      const el = ref.current
      if (!el) return
      // Um handler interno (ex.: popover dentro da folha) pode consumir o Esc com preventDefault()
      if (e.key === 'Escape' && !e.defaultPrevented && opts.current.onEscape) {
        e.stopPropagation()
        opts.current.onEscape()
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      )
      if (items.length === 0) {
        e.preventDefault()
        el.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === first || current === el)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      } else if (!el.contains(current)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey, true)
      if (lock) document.body.style.overflow = overflow
      previous?.focus?.({ preventScroll: true })
    }
  }, [active, ref])
}
