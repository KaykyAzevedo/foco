import { useEffect } from 'react'

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** `N` (fora de campos de texto) ou `Ctrl/⌘+K` (em qualquer lugar) abrem a captura. */
export function useCaptureShortcut(onOpen: () => void) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.isComposing || e.repeat) return
      const key = e.key.toLowerCase()
      const ctrlK = (e.ctrlKey || e.metaKey) && key === 'k'
      const plainN = key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)
      if (ctrlK || plainN) {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onOpen])
}
