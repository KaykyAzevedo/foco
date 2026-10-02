// Lembretes via Notification API: 1 dia antes, 1 hora antes e no prazo.
import { DAY, HOUR, formatDue, formatHour, toDate } from '@/domain'
import type { Task } from '@/domain'

export type ReminderKind = 'day' | 'hour' | 'due'

export interface Reminder {
  /** chave única (tarefa + tipo + prazo) para não repetir */
  key: string
  taskId: string
  kind: ReminderKind
  at: Date
  title: string
  body: string
}

const OFFSETS: Record<ReminderKind, number> = { day: DAY, hour: HOUR, due: 0 }

/** Todos os lembretes de uma tarefa (puro). Concluídas ou sem prazo → []. */
export function remindersFor(task: Task): Reminder[] {
  if (!task.due || task.doneAt) return []
  const due = toDate(task.due)
  const boss = task.fromBoss ? ' · da chefe' : ''
  return (Object.keys(OFFSETS) as ReminderKind[]).map((kind) => {
    const at = new Date(due.getTime() - OFFSETS[kind])
    const body =
      kind === 'due'
        ? `O prazo é agora${boss}. Respira e faz o primeiro passo.`
        : kind === 'hour'
          ? `Falta 1 hora (${formatHour(due)})${boss}.`
          : `Prazo ${formatDue(due, at)}${boss}.`
    return { key: `${task.id}:${kind}:${task.due}`, taskId: task.id, kind, at, title: task.title, body }
  })
}

/**
 * Lembretes cujo horário caiu em (since, now] e ainda não foram enviados (puro).
 * Se vários da mesma tarefa caem juntos (app fechado), manda só o mais recente.
 */
export function dueReminders(tasks: readonly Task[], since: Date, now: Date, sent: ReadonlySet<string>): Reminder[] {
  const hits = tasks.flatMap((t) => remindersFor(t)).filter((r) => r.at > since && r.at <= now)
  return hits
    .filter((r) => !hits.some((o) => o.taskId === r.taskId && o.at > r.at))
    .filter((r) => !sent.has(r.key))
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export function notify(title: string, body: string, tag?: string): void {
  if (notificationPermission() !== 'granted') return
  try {
    new Notification(title, { body, tag })
  } catch {
    // alguns navegadores móveis exigem service worker; ignora silenciosamente
  }
}

const SENT_KEY = 'foco:reminders-sent'

function loadSent(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveSent(sent: Set<string>) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...sent].slice(-500)))
  } catch {
    /* sem armazenamento: só não deduplica entre sessões */
  }
}

export interface ReminderLoopOptions {
  /** intervalo de checagem (padrão 30 s) */
  intervalMs?: number
  /** ao iniciar, recupera lembretes perdidos nos últimos N ms (padrão 15 min) */
  catchUpMs?: number
  /** consultado a cada checagem, ex.: () => useSettings.getState().notifications */
  isEnabled?: () => boolean
  /** substitui o envio (testes / toast interno) */
  onReminder?: (r: Reminder) => void
}

/** Inicia o laço de lembretes. Devolve a função para parar. */
export function startReminderLoop(getTasks: () => readonly Task[], opts: ReminderLoopOptions = {}): () => void {
  const { intervalMs = 30_000, catchUpMs = 15 * 60_000, isEnabled = () => true } = opts
  const send = opts.onReminder ?? ((r: Reminder) => notify(r.title, r.body, r.key))
  let since = new Date(Date.now() - catchUpMs)
  const tick = () => {
    const now = new Date()
    if (isEnabled()) {
      const sent = loadSent()
      const list = dueReminders(getTasks(), since, now, sent)
      for (const r of list) {
        send(r)
        sent.add(r.key)
      }
      if (list.length) saveSent(sent)
    }
    since = now
  }
  tick()
  const id = setInterval(tick, intervalMs)
  return () => clearInterval(id)
}
