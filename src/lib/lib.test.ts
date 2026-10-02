import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initialGameState } from '@/domain'
import type { Reward } from '@/domain'
import { at, makeTask, NOW } from '@/domain/test-utils'
import { useGame } from '@/store/useGame'
import { useSettings } from '@/store/useSettings'
import { useTasks } from '@/store/useTasks'
import {
  backupFileName,
  backupSummary,
  createBackup,
  importBackupFile,
  parseBackup,
  readBackupFile,
  resetAllData,
  restoreBackup,
  serializeBackup,
} from './backup'
import { celebrationFor, shouldReduceMotion } from './confetti'
import { dueReminders, notify, remindersFor, startReminderLoop } from './notifications'

describe('notifications', () => {
  it('remindersFor: 1 dia, 1 hora e no prazo', () => {
    const t = makeTask({ id: 'a', due: at(2026, 10, 3, 15), fromBoss: true })
    const r = remindersFor(t)
    expect(r.map((x) => [x.kind, x.at.toISOString()])).toEqual([
      ['day', at(2026, 10, 2, 15)],
      ['hour', at(2026, 10, 3, 14)],
      ['due', at(2026, 10, 3, 15)],
    ])
    expect(r[1].body).toBe('Falta 1 hora (15h) · da chefe.')
    expect(remindersFor(makeTask())).toEqual([])
    expect(remindersFor(makeTask({ due: at(2026, 10, 3), doneAt: at(2026, 10, 2) }))).toEqual([])
  })

  it('dueReminders filtra janela, enviados e manda só o mais recente da tarefa', () => {
    const t = makeTask({ id: 'a', due: at(2026, 10, 2, 11) }) // day=01/10 11h, hour=02/10 10h, due=11h
    const since = new Date(2026, 9, 1, 0)
    const now = new Date(2026, 9, 2, 10, 5)
    const list = dueReminders([t], since, now, new Set())
    expect(list.map((r) => r.kind)).toEqual(['hour'])
    expect(dueReminders([t], since, now, new Set([list[0].key]))).toEqual([])
    expect(dueReminders([t], now, new Date(2026, 9, 2, 11), new Set()).map((r) => r.kind)).toEqual(['due'])
  })

  it('startReminderLoop envia uma vez e respeita isEnabled', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 2, 9, 59))
    localStorage.clear()
    const sent: string[] = []
    const tasks = [makeTask({ id: 'a', due: at(2026, 10, 2, 11) })]
    let enabled = true
    const stop = startReminderLoop(() => tasks, { onReminder: (r) => sent.push(r.kind), isEnabled: () => enabled })
    expect(sent).toEqual([])
    vi.advanceTimersByTime(2 * 60_000)
    expect(sent).toEqual(['hour'])
    vi.advanceTimersByTime(5 * 60_000)
    expect(sent).toEqual(['hour'])
    enabled = false
    vi.advanceTimersByTime(60 * 60_000)
    expect(sent).toEqual(['hour'])
    stop()
    vi.useRealTimers()
  })
})

describe('confetti', () => {
  it('shouldReduceMotion: ajuste do app OU sistema', () => {
    const mm = vi.fn().mockReturnValue({ matches: false })
    vi.stubGlobal('matchMedia', mm)
    useSettings.getState().setReduceMotion(false)
    expect(shouldReduceMotion()).toBe(false)
    useSettings.getState().setReduceMotion(true)
    expect(shouldReduceMotion()).toBe(true)
    useSettings.getState().setReduceMotion(false)
    document.documentElement.setAttribute('data-reduce-motion', '')
    expect(shouldReduceMotion()).toBe(true)
    document.documentElement.removeAttribute('data-reduce-motion')
    expect(shouldReduceMotion()).toBe(false)
    mm.mockReturnValue({ matches: true })
    expect(shouldReduceMotion()).toBe(true)
    vi.unstubAllGlobals()
  })

  const base: Reward = {
    kind: 'task', xp: 10, breakdown: [], combo: 1, comboMultiplier: 1, streak: 1, shieldUsed: false,
    levelBefore: 1, levelAfter: 1, leveledUp: false, unlocked: [], repeat: false, at: NOW.toISOString(),
  }
  it('só marcos soltam confete', () => {
    expect(celebrationFor(base)).toBeUndefined()
    expect(celebrationFor({ ...base, leveledUp: true, levelAfter: 2 })).toBe('level')
    expect(celebrationFor({ ...base, unlocked: [{ id: 'x', title: 'x', description: '', icon: '' }] })).toBe('achievement')
    expect(celebrationFor({ ...base, missionCompleted: { id: 'm', title: 'm', target: 1, rewardXp: 15 } })).toBe('mission')
  })
})

describe('backup', () => {
  beforeEach(() => {
    localStorage.clear()
    useTasks.setState({ tasks: [] })
    useGame.setState({ ...initialGameState(NOW), lastReward: undefined })
    useSettings.getState().reset()
  })

  it('ida e volta preserva tudo', () => {
    useTasks.getState().add({ title: 'a', due: at(2026, 10, 3), steps: ['s1'] }, NOW)
    useTasks.getState().complete(useTasks.getState().tasks[0].id, NOW)
    useSettings.getState().setTheme('dark')
    const backup = createBackup(NOW)
    const text = serializeBackup(backup)

    useTasks.setState({ tasks: [] })
    useGame.getState().reset()
    useSettings.getState().reset()

    const parsed = parseBackup(text, NOW)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    restoreBackup(parsed.backup)
    expect(useTasks.getState().tasks).toEqual(backup.tasks)
    expect(useGame.getState().xp).toBe(backup.game.xp)
    expect(useSettings.getState().theme).toBe('dark')
  })

  it('rejeita lixo com mensagens em PT-BR', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'Arquivo não é um JSON válido.' })
    expect(parseBackup('{"app":"outro"}')).toMatchObject({ ok: false, error: 'Este arquivo não é um backup do Foco.' })
    expect(parseBackup('{"app":"foco","version":99,"tasks":[]}')).toMatchObject({ ok: false })
    expect(parseBackup('{"app":"foco","version":1}')).toMatchObject({ ok: false })
  })

  it('normaliza tarefas e descarta inválidas', () => {
    const text = JSON.stringify({
      app: 'foco',
      version: 1,
      tasks: [
        { id: 'ok', title: 'válida', due: 'não-é-data', urgent: 'sim', steps: [{ title: 'p' }, 3] },
        { title: 'sem id' },
        null,
      ],
      settings: { theme: 'neon', focusMinutes: 15 },
    })
    const r = parseBackup(text, NOW)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.tasks).toHaveLength(1)
    expect(r.backup.tasks[0]).toMatchObject({ id: 'ok', due: undefined, urgent: false, fromBoss: false })
    expect(r.backup.tasks[0].steps).toEqual([{ id: 'step-0', title: 'p', done: false, rewarded: undefined }])
    expect(r.backup.settings).toMatchObject({ theme: 'system', focusMinutes: 15, reduceMotion: false })
    expect(r.backup.game.xp).toBe(0)
  })

  it('backup antigo sem rewardedAt: concluídas contam como já premiadas (anti-farm)', () => {
    const text = JSON.stringify({
      app: 'foco',
      version: 1,
      tasks: [{ id: 'a', title: 'a', doneAt: at(2026, 10, 1, 9), steps: [{ id: 's', title: 's', done: true }] }],
    })
    const r = parseBackup(text, NOW)
    if (!r.ok) throw new Error(r.error)
    expect(r.backup.tasks[0].rewardedAt).toBe(at(2026, 10, 1, 9))
    expect(r.backup.tasks[0].steps[0].rewarded).toBe(true)
    restoreBackup(r.backup)
    useTasks.getState().uncomplete('a')
    expect(useTasks.getState().complete('a', NOW)?.xp).toBe(0)
  })

  it('backupSummary e backupFileName', () => {
    useTasks.getState().add({ title: 'a' }, NOW)
    useTasks.getState().add({ title: 'b' }, NOW)
    useTasks.getState().complete(useTasks.getState().tasks[0].id, NOW)
    const s = backupSummary(createBackup(new Date(2026, 9, 2, 11, 30)))
    expect(s).toMatchObject({ tasks: 2, open: 1, done: 1, level: 1 })
    expect(s.text).toBe('2 tarefas (1 aberta) · nível 1 · salvo em 02/10/2026 às 11h30')
    expect(backupFileName(NOW)).toBe('foco-backup-2026-10-02.json')
  })

  it('readBackupFile não aplica; importBackupFile aplica', async () => {
    useTasks.getState().add({ title: 'original' }, NOW)
    const text = serializeBackup({ ...createBackup(NOW), tasks: [makeTask({ id: 'imp', title: 'importada' })] })
    const file = new File([text], 'foco.json', { type: 'application/json' })
    const preview = await readBackupFile(file)
    expect(preview.ok).toBe(true)
    expect(useTasks.getState().tasks[0].title).toBe('original')
    await importBackupFile(file)
    expect(useTasks.getState().tasks.map((t) => t.title)).toEqual(['importada'])
    expect(await readBackupFile(new File(['xx'], 'x.json'))).toMatchObject({ ok: false })
  })

  it('resetAllData zera tudo', () => {
    useTasks.getState().add({ title: 'a' }, NOW)
    useTasks.getState().complete(useTasks.getState().tasks[0].id, NOW)
    useSettings.getState().setTheme('dark')
    localStorage.setItem('foco:reminders-sent', '["x"]')
    resetAllData()
    expect(useTasks.getState().tasks).toEqual([])
    expect(useGame.getState().xp).toBe(0)
    expect(useSettings.getState().theme).toBe('system')
    expect(localStorage.getItem('foco:reminders-sent')).toBeNull()
  })
})

describe('notify', () => {
  it('sem permissão não mostra nada', async () => {
    vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'default' }))
    expect(await notify('t', 'b')).toBe(false)
    vi.unstubAllGlobals()
  })

  it('usa o service worker quando registrado (funciona com a aba em segundo plano)', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    const ctor = vi.fn()
    vi.stubGlobal('Notification', Object.assign(ctor, { permission: 'granted' }))
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration: vi.fn().mockResolvedValue({ showNotification }) },
    })
    expect(await notify('Relatório', 'Falta 1 hora', 'k')).toBe(true)
    expect(showNotification).toHaveBeenCalledWith('Relatório', expect.objectContaining({ body: 'Falta 1 hora', tag: 'k', data: { url: '/' } }))
    expect(ctor).not.toHaveBeenCalled()
    // sem registro: cai para new Notification
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration: vi.fn().mockResolvedValue(undefined) },
    })
    expect(await notify('A', 'B')).toBe(true)
    expect(ctor).toHaveBeenCalled()
    Reflect.deleteProperty(navigator, 'serviceWorker')
    vi.unstubAllGlobals()
  })
})
