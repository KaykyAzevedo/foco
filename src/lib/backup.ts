// Exportar/importar todos os dados em JSON (local-first, sem nuvem).
import { dayKey, initialGameState, isValidISO } from '@/domain'
import type { GameState, Settings, Step, Task } from '@/domain'
import { gameData, useGame } from '@/store/useGame'
import { DEFAULT_SETTINGS, settingsData, useSettings } from '@/store/useSettings'
import { useTasks } from '@/store/useTasks'

export const BACKUP_VERSION = 1

export interface Backup {
  app: 'foco'
  version: number
  exportedAt: string
  tasks: Task[]
  game: GameState
  settings: Settings
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const optStr = (v: unknown) => (typeof v === 'string' ? v : undefined)
const optISO = (v: unknown) => (isValidISO(v) ? v : undefined)

function sanitizeStep(v: unknown, i: number): Step | undefined {
  if (!isObj(v) || typeof v.title !== 'string') return undefined
  return { id: typeof v.id === 'string' ? v.id : `step-${i}`, title: v.title, done: v.done === true }
}

function sanitizeTask(v: unknown): Task | undefined {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.title !== 'string') return undefined
  const steps = Array.isArray(v.steps) ? v.steps.map(sanitizeStep).filter((s): s is Step => !!s) : []
  return {
    id: v.id,
    title: v.title,
    notes: optStr(v.notes),
    createdAt: optISO(v.createdAt) ?? new Date(0).toISOString(),
    due: optISO(v.due),
    estimateMin: typeof v.estimateMin === 'number' && v.estimateMin > 0 ? v.estimateMin : undefined,
    urgent: v.urgent === true,
    fromBoss: v.fromBoss === true,
    plannedFor: typeof v.plannedFor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.plannedFor) ? v.plannedFor : undefined,
    isMain: typeof v.isMain === 'boolean' ? v.isMain : undefined,
    steps,
    doneAt: optISO(v.doneAt),
    skippedAt: optISO(v.skippedAt),
    order: typeof v.order === 'number' ? v.order : undefined,
  }
}

function sanitizeGame(v: unknown, now: Date): GameState {
  const base = initialGameState(now)
  if (!isObj(v)) return base
  return {
    xp: typeof v.xp === 'number' && v.xp >= 0 ? v.xp : 0,
    streak: isObj(v.streak) ? { ...base.streak, ...(v.streak as object) } : base.streak,
    combo: isObj(v.combo) ? { ...base.combo, ...(v.combo as object) } : base.combo,
    stats: isObj(v.stats) ? { ...base.stats, ...(v.stats as object) } : base.stats,
    today: isObj(v.today) ? { ...base.today, ...(v.today as object) } : base.today,
    achievements: isObj(v.achievements) ? (v.achievements as Record<string, string>) : {},
  }
}

function sanitizeSettings(v: unknown): Settings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS }
  const theme = v.theme === 'light' || v.theme === 'dark' || v.theme === 'system' ? v.theme : DEFAULT_SETTINGS.theme
  return {
    theme,
    sound: typeof v.sound === 'boolean' ? v.sound : DEFAULT_SETTINGS.sound,
    notifications: typeof v.notifications === 'boolean' ? v.notifications : DEFAULT_SETTINGS.notifications,
    focusMinutes: typeof v.focusMinutes === 'number' && v.focusMinutes > 0 ? v.focusMinutes : DEFAULT_SETTINGS.focusMinutes,
    lastMorningSummary: optStr(v.lastMorningSummary),
  }
}

/** Valida e normaliza um JSON de backup (puro). Tarefas inválidas são descartadas. */
export function parseBackup(text: string, now: Date = new Date()): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Arquivo não é um JSON válido.' }
  }
  if (!isObj(data) || data.app !== 'foco') return { ok: false, error: 'Este arquivo não é um backup do Foco.' }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION)
    return { ok: false, error: 'Backup de uma versão mais nova do Foco.' }
  if (!Array.isArray(data.tasks)) return { ok: false, error: 'Backup sem lista de tarefas.' }
  return {
    ok: true,
    backup: {
      app: 'foco',
      version: BACKUP_VERSION,
      exportedAt: optISO(data.exportedAt) ?? now.toISOString(),
      tasks: data.tasks.map(sanitizeTask).filter((t): t is Task => !!t),
      game: sanitizeGame(data.game, now),
      settings: sanitizeSettings(data.settings),
    },
  }
}

/** Fotografia atual dos stores. */
export function createBackup(now: Date = new Date()): Backup {
  return {
    app: 'foco',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    tasks: useTasks.getState().tasks,
    game: gameData(useGame.getState()),
    settings: settingsData(useSettings.getState()),
  }
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2)
}

/** Substitui todos os dados pelos do backup. */
export function restoreBackup(backup: Backup): void {
  useTasks.getState().replaceAll(backup.tasks)
  useGame.getState().replace(backup.game)
  useSettings.getState().update(backup.settings)
}

/** Baixa `foco-backup-AAAA-MM-DD.json`. */
export function downloadBackup(now: Date = new Date()): void {
  const blob = new Blob([serializeBackup(createBackup(now))], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `foco-backup-${dayKey(now)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Lê um arquivo escolhido pelo usuário e, se válido, restaura. */
export async function importBackupFile(file: File): Promise<ParseResult> {
  const result = parseBackup(await file.text())
  if (result.ok) restoreBackup(result.backup)
  return result
}
