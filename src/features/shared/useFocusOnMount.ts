import { useEffect, useRef, type RefObject } from 'react'

/**
 * Ao montar, foca o elemento se a flag estiver ligada e a consome.
 * Usado para não perder o lugar do teclado quando o botão clicado desmonta (Feito, Pular, Fechar o plano…).
 * A flag é consumida no effect (não no render), então é segura em StrictMode.
 */
export function useFocusOnMount<T extends HTMLElement>(flag: RefObject<boolean>) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!flag.current) return
    flag.current = false
    ref.current?.focus({ preventScroll: true })
  }, [flag])
  return ref
}
