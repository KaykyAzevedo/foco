import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DayKey, Settings, ThemePref } from '@/domain'

export const FOCUS_OPTIONS = [10, 15, 25, 45] as const

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sound: false,
  notifications: false,
  reduceMotion: false,
  focusMinutes: 25,
}

export interface SettingsStore extends Settings {
  setTheme(theme: ThemePref): void
  setSound(on: boolean): void
  setNotifications(on: boolean): void
  /** "Reduzir animações" (false = seguir o sistema). */
  setReduceMotion(on: boolean): void
  setFocusMinutes(min: number): void
  /** Marca que o resumo da manhã já foi mostrado em `day`. */
  markMorningSummary(day: DayKey): void
  update(patch: Partial<Settings>): void
  reset(): void
}

export function settingsData(s: SettingsStore): Settings {
  return {
    theme: s.theme,
    sound: s.sound,
    notifications: s.notifications,
    reduceMotion: s.reduceMotion,
    focusMinutes: s.focusMinutes,
    lastMorningSummary: s.lastMorningSummary,
  }
}

export const useSettings = create<SettingsStore>()(
  persist<SettingsStore, [], [], Settings>(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setSound: (sound) => set({ sound }),
      setNotifications: (notifications) => set({ notifications }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setFocusMinutes: (min) => set({ focusMinutes: Math.max(1, Math.round(min)) }),
      markMorningSummary: (day) => set({ lastMorningSummary: day }),
      update: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS, lastMorningSummary: undefined }),
    }),
    {
      name: 'foco:settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => settingsData(s),
      // dados salvos antes de um campo existir ganham o padrão
      merge: (persisted, current) => ({ ...current, ...DEFAULT_SETTINGS, ...(persisted as Partial<Settings>) }),
    },
  ),
)
