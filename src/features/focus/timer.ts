// Máquina de estados do timer do Modo Foco — pura, recebe `now` (ms). Testada em timer.test.ts.

export const MINUTE_MS = 60_000
/** Tempo contínuo de foco que dispara o aviso gentil de hiperfoco. */
export const HYPERFOCUS_MS = 90 * MINUTE_MS
/** "Agora não" adia o próximo aviso por este tempo. */
export const NUDGE_SNOOZE_MS = 30 * MINUTE_MS
/** Uma pausa manual a partir disto conta como pausa de verdade (zera o contador de 90 min). */
export const REAL_PAUSE_MS = 5 * MINUTE_MS
export const BREAK_MS = 5 * MINUTE_MS
export const EXTEND_MS = 5 * MINUTE_MS

export type Phase = 'idle' | 'running' | 'paused' | 'finished' | 'break'

export interface TimerState {
  phase: Phase
  /** Duração escolhida para a sessão. */
  durationMs: number
  /** Duração total da sessão atual (duração + extensões de +5 min) — base do anel. */
  totalMs: number
  /** Tempo restante (sessão, ou pausa quando phase = 'break'). */
  remainingMs: number
  /** Fim previsto quando rodando (sessão ou pausa). */
  endsAt?: number
  /** Quando foi pausado. */
  pausedAt?: number
  /** Quando o timer parou sem estar em pausa (fim da sessão, recomeço). Parado ≥5 min conta como pausa real. */
  stoppedAt?: number
  /** Sessão interrompida por uma pausa (5 min): volta pausada com este restante. */
  resume?: { remainingMs: number; totalMs: number }
  /** Último instante contabilizado no foco contínuo. */
  lastTickAt?: number
  /** Foco contínuo acumulado desde a última pausa real. */
  focusedMs: number
  /** Limite que dispara o próximo aviso. */
  nudgeAtMs: number
  /** Aviso de hiperfoco visível. */
  nudge: boolean
  /** Sessões completas desde que o modo foco abriu. */
  sessions: number
}

export type TimerAction =
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'extend'; now: number; ms?: number }
  | { type: 'setDuration'; minutes: number }
  | { type: 'takeBreak'; now: number; ms?: number }
  | { type: 'endBreak' }
  | { type: 'dismissNudge' }
  | { type: 'restart'; now?: number }

export function initialTimer(minutes: number): TimerState {
  const durationMs = minutes * MINUTE_MS
  return {
    phase: 'idle',
    durationMs,
    totalMs: durationMs,
    remainingMs: durationMs,
    focusedMs: 0,
    nudgeAtMs: HYPERFOCUS_MS,
    nudge: false,
    sessions: 0,
  }
}

/** Parado tempo suficiente → zera o contador de hiperfoco. */
function restedIfStopped(s: TimerState, now: number): Partial<TimerState> {
  return s.stoppedAt != null && now - s.stoppedAt >= REAL_PAUSE_MS
    ? { focusedMs: 0, nudgeAtMs: HYPERFOCUS_MS, nudge: false }
    : {}
}

function accrue(s: TimerState, now: number): TimerState {
  if (s.lastTickAt == null) return s
  const focusedMs = s.focusedMs + Math.max(0, now - s.lastTickAt)
  return { ...s, focusedMs, lastTickAt: now, nudge: s.nudge || focusedMs >= s.nudgeAtMs }
}

export function timerReducer(s: TimerState, a: TimerAction): TimerState {
  switch (a.type) {
    case 'start':
      if (s.phase !== 'idle' && s.phase !== 'finished') return s
      return {
        ...s,
        ...restedIfStopped(s, a.now),
        phase: 'running',
        totalMs: s.durationMs,
        remainingMs: s.durationMs,
        endsAt: a.now + s.durationMs,
        lastTickAt: a.now,
        pausedAt: undefined,
        stoppedAt: undefined,
      }
    case 'pause': {
      if (s.phase !== 'running') return s
      const t = accrue(s, a.now)
      return { ...t, phase: 'paused', remainingMs: Math.max(0, (s.endsAt ?? a.now) - a.now), endsAt: undefined, lastTickAt: undefined, pausedAt: a.now }
    }
    case 'resume': {
      if (s.phase !== 'paused') return s
      const longPause = s.pausedAt != null && a.now - s.pausedAt >= REAL_PAUSE_MS
      return {
        ...s,
        phase: 'running',
        endsAt: a.now + s.remainingMs,
        lastTickAt: a.now,
        pausedAt: undefined,
        ...(longPause ? { focusedMs: 0, nudgeAtMs: HYPERFOCUS_MS, nudge: false } : null),
      }
    }
    case 'tick': {
      if (s.phase === 'running') {
        const remainingMs = Math.max(0, (s.endsAt ?? a.now) - a.now)
        if (remainingMs === 0) {
          const t = accrue(s, a.now)
          return { ...t, phase: 'finished', remainingMs: 0, endsAt: undefined, lastTickAt: undefined, stoppedAt: a.now, sessions: s.sessions + 1 }
        }
        // só gera estado novo quando o segundo exibido muda (1 render/s) ou o aviso dispara
        const sameSecond = Math.ceil(remainingMs / 1000) === Math.ceil(s.remainingMs / 1000)
        const crossesNudge = !s.nudge && s.focusedMs + (a.now - (s.lastTickAt ?? a.now)) >= s.nudgeAtMs
        if (sameSecond && !crossesNudge) return s
        return { ...accrue(s, a.now), remainingMs }
      }
      if (s.phase === 'break') {
        const remainingMs = Math.max(0, (s.endsAt ?? a.now) - a.now)
        if (remainingMs === 0) return endBreak(s)
        if (Math.ceil(remainingMs / 1000) === Math.ceil(s.remainingMs / 1000)) return s
        return { ...s, remainingMs }
      }
      return s
    }
    case 'extend': {
      const ms = a.ms ?? EXTEND_MS
      if (s.phase === 'finished') {
        return { ...s, ...restedIfStopped(s, a.now), phase: 'running', totalMs: ms, remainingMs: ms, endsAt: a.now + ms, lastTickAt: a.now, stoppedAt: undefined }
      }
      if (s.phase === 'running')
        return { ...s, totalMs: s.totalMs + ms, remainingMs: s.remainingMs + ms, endsAt: (s.endsAt ?? a.now) + ms }
      if (s.phase === 'paused') return { ...s, totalMs: s.totalMs + ms, remainingMs: s.remainingMs + ms }
      return s
    }
    case 'setDuration': {
      if (s.phase !== 'idle' && s.phase !== 'finished') return s
      const durationMs = a.minutes * MINUTE_MS
      return { ...s, phase: 'idle', durationMs, totalMs: durationMs, remainingMs: durationMs }
    }
    case 'takeBreak': {
      const ms = a.ms ?? BREAK_MS
      // pausa no meio da sessão: o restante fica guardado e volta pausado depois
      const remaining =
        s.phase === 'running' ? Math.max(0, (s.endsAt ?? a.now) - a.now) : s.phase === 'paused' ? s.remainingMs : 0
      return {
        ...s,
        resume: remaining > 0 ? { remainingMs: remaining, totalMs: s.totalMs } : undefined,
        stoppedAt: undefined,
        phase: 'break',
        remainingMs: ms,
        endsAt: a.now + ms,
        lastTickAt: undefined,
        pausedAt: undefined,
        focusedMs: 0,
        nudgeAtMs: HYPERFOCUS_MS,
        nudge: false,
      }
    }
    case 'endBreak':
      if (s.phase !== 'break') return s
      return endBreak(s)
    case 'dismissNudge':
      return { ...s, nudge: false, nudgeAtMs: s.focusedMs + NUDGE_SNOOZE_MS }
    case 'restart': {
      const t = s.phase === 'running' && a.now != null ? accrue(s, a.now) : s
      return {
        ...t,
        phase: 'idle',
        totalMs: s.durationMs,
        remainingMs: s.durationMs,
        endsAt: undefined,
        lastTickAt: undefined,
        stoppedAt: s.pausedAt ?? a.now ?? s.stoppedAt,
        pausedAt: undefined,
        resume: undefined,
      }
    }
  }
}

/** Fim da pausa: volta pausado no ponto onde a sessão estava, ou pronto para uma nova. */
function endBreak(s: TimerState): TimerState {
  if (s.resume) {
    return { ...s, phase: 'paused', remainingMs: s.resume.remainingMs, totalMs: s.resume.totalMs, endsAt: undefined, pausedAt: undefined, resume: undefined }
  }
  return { ...s, phase: 'idle', totalMs: s.durationMs, remainingMs: s.durationMs, endsAt: undefined }
}

/** "1h30", "2h", "45 min" — para o aviso de hiperfoco. */
export function formatFocused(ms: number): string {
  const min = Math.floor(ms / MINUTE_MS)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** "25:00", "4:05", "1:02:03" */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Texto para leitores de tela: "12 minutos restantes". */
export function spokenRemaining(ms: number): string {
  const min = Math.ceil(Math.max(0, ms) / MINUTE_MS)
  return min <= 1 ? 'menos de 1 minuto restante' : `${min} minutos restantes`
}
