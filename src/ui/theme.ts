import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const KEY = 'foco:theme'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

/** Aplica a preferência no <html data-theme>. 'system' remove o atributo (segue o SO). */
export function applyTheme(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
  const meta = document.querySelector('meta[name="theme-color"]')
  const dark = pref === 'dark' || (pref === 'system' && systemPrefersDark())
  meta?.setAttribute('content', dark ? '#07070e' : '#eef0f8')
}

export function readTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Hook de tema. `resolved` é o tema efetivo ('light' | 'dark').
 * Ex.: const { preference, setPreference, resolved } = useTheme()
 */
export function useTheme() {
  const [preference, setPref] = useState<ThemePreference>(readTheme)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    applyTheme(preference)
  }, [preference, systemDark])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = () => setSystemDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p)
    try {
      if (p === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, p)
    } catch {
      /* armazenamento indisponível: só não persiste */
    }
  }, [])

  const resolved: 'light' | 'dark' =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  return { preference, setPreference, resolved }
}
