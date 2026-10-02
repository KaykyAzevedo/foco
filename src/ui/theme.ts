import { useEffect, useState } from 'react'
import type { ThemePref } from '@/domain'
import { useSettings } from '@/store'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

/** Aplica a preferência no <html data-theme>. 'system' remove o atributo (segue o SO). Não persiste nada. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
  const dark = pref === 'dark' || (pref === 'system' && systemPrefersDark())
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#07070e' : '#eef0f8')
}

/**
 * Lê o tema de useSettings (fonte única), aplica no <html> e acompanha o SO quando 'system'.
 * Chame uma vez no App. Devolve o tema efetivo: 'light' | 'dark'.
 * Para trocar: useSettings.getState().setTheme('dark').
 */
export function useAppliedTheme(): 'light' | 'dark' {
  const pref = useSettings((s) => s.theme)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    applyTheme(pref)
  }, [pref, systemDark])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = () => setSystemDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
}
