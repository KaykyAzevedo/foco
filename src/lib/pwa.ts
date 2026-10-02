// PWA: instalação ("Adicionar à tela inicial") e detecção de modo app.
// O service worker é registrado automaticamente pelo vite-plugin-pwa (registerType: autoUpdate).
import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | undefined
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // a UI decide quando oferecer (sem banner do navegador na cara)
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = undefined
    installed = true
    emit()
  })
}

/** Rodando como app instalado (standalone)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** O navegador ofereceu instalação (Chrome/Edge/Android) e ainda não foi instalado? */
export function canInstall(): boolean {
  return deferred != null && !installed && !isStandalone()
}

/** iOS Safari não tem prompt: a UI pode mostrar "Compartilhar → Adicionar à Tela de Início". */
export function needsManualInstallHint(): boolean {
  if (typeof navigator === 'undefined' || isStandalone()) return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Abre o prompt nativo de instalação. Devolve o resultado. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  const e = deferred
  deferred = undefined
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'accepted') installed = true
  emit()
  return outcome
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Hook: `{ canInstall, install, standalone, iosHint }` para um botão "Instalar o Foco". */
export function useInstallPrompt() {
  const available = useSyncExternalStore(subscribe, canInstall, () => false)
  return {
    canInstall: available,
    install: promptInstall,
    standalone: isStandalone(),
    iosHint: needsManualInstallHint(),
  }
}
