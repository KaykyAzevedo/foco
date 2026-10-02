import { HYPERFOCUS_MS, MINUTE_MS, NUDGE_SNOOZE_MS, formatClock, formatFocused, initialTimer, timerReducer, type TimerAction, type TimerState } from './timer'

const run = (s: TimerState, ...actions: TimerAction[]) => actions.reduce(timerReducer, s)
const T0 = 1_000_000

describe('timer do modo foco', () => {
  it('começa, conta e termina a sessão', () => {
    let s = run(initialTimer(25), { type: 'start', now: T0 })
    expect(s.phase).toBe('running')
    s = timerReducer(s, { type: 'tick', now: T0 + 10 * MINUTE_MS })
    expect(s.remainingMs).toBe(15 * MINUTE_MS)
    s = timerReducer(s, { type: 'tick', now: T0 + 25 * MINUTE_MS })
    expect(s.phase).toBe('finished')
    expect(s.sessions).toBe(1)
  })

  it('pausa e retoma sem perder tempo', () => {
    const s = run(
      initialTimer(10),
      { type: 'start', now: T0 },
      { type: 'pause', now: T0 + 4 * MINUTE_MS },
      { type: 'resume', now: T0 + 6 * MINUTE_MS },
      { type: 'tick', now: T0 + 7 * MINUTE_MS },
    )
    expect(s.remainingMs).toBe(5 * MINUTE_MS)
  })

  it('+5 min ao terminar volta a rodar', () => {
    let s = run(initialTimer(10), { type: 'start', now: T0 }, { type: 'tick', now: T0 + 10 * MINUTE_MS })
    s = timerReducer(s, { type: 'extend', now: T0 + 11 * MINUTE_MS })
    expect(s.phase).toBe('running')
    expect(s.remainingMs).toBe(5 * MINUTE_MS)
  })

  it('só troca a duração quando parado', () => {
    let s = timerReducer(initialTimer(25), { type: 'setDuration', minutes: 45 })
    expect(s.remainingMs).toBe(45 * MINUTE_MS)
    s = run(s, { type: 'start', now: T0 }, { type: 'setDuration', minutes: 10 })
    expect(s.durationMs).toBe(45 * MINUTE_MS)
  })

  it('avisa após 90 min de foco contínuo, adia com "agora não" e zera com pausa', () => {
    let s = initialTimer(45)
    let now = T0
    // 2 sessões de 45 min seguidas = 90 min
    for (let i = 0; i < 2; i++) {
      s = timerReducer(s, { type: 'start', now })
      now += 45 * MINUTE_MS
      s = timerReducer(s, { type: 'tick', now })
    }
    expect(s.focusedMs).toBe(HYPERFOCUS_MS)
    expect(s.nudge).toBe(true)
    s = timerReducer(s, { type: 'dismissNudge' })
    expect(s.nudge).toBe(false)
    expect(s.nudgeAtMs).toBe(HYPERFOCUS_MS + NUDGE_SNOOZE_MS)
    s = timerReducer(s, { type: 'takeBreak', now })
    expect(s.phase).toBe('break')
    expect(s.focusedMs).toBe(0)
    s = timerReducer(s, { type: 'tick', now: now + 5 * MINUTE_MS })
    expect(s.phase).toBe('idle')
  })

  it('pausa curta não zera o contador de hiperfoco; pausa longa zera', () => {
    const base = run(initialTimer(45), { type: 'start', now: T0 }, { type: 'pause', now: T0 + 30 * MINUTE_MS })
    expect(timerReducer(base, { type: 'resume', now: T0 + 31 * MINUTE_MS }).focusedMs).toBe(30 * MINUTE_MS)
    expect(timerReducer(base, { type: 'resume', now: T0 + 36 * MINUTE_MS }).focusedMs).toBe(0)
  })

  it('formata o relógio', () => {
    expect(formatClock(25 * MINUTE_MS)).toBe('25:00')
    expect(formatClock(4 * MINUTE_MS + 4_100)).toBe('4:05')
    expect(formatClock(0)).toBe('0:00')
  })

  it('pausa no meio da sessão guarda o restante e volta pausado', () => {
    let s = run(initialTimer(25), { type: 'start', now: T0 }, { type: 'takeBreak', now: T0 + 10 * MINUTE_MS })
    expect(s.phase).toBe('break')
    s = timerReducer(s, { type: 'tick', now: T0 + 15 * MINUTE_MS })
    expect(s.phase).toBe('paused')
    expect(s.remainingMs).toBe(15 * MINUTE_MS)
    expect(s.totalMs).toBe(25 * MINUTE_MS)
    s = run(s, { type: 'resume', now: T0 + 16 * MINUTE_MS }, { type: 'tick', now: T0 + 31 * MINUTE_MS })
    expect(s.phase).toBe('finished')
    expect(s.sessions).toBe(1)
  })

  it('+5 min durante a sessão aumenta o total (o anel não trava cheio)', () => {
    const s = run(initialTimer(10), { type: 'start', now: T0 }, { type: 'extend', now: T0 + MINUTE_MS })
    expect(s.totalMs).toBe(15 * MINUTE_MS)
    expect(s.remainingMs / s.totalMs).toBeLessThanOrEqual(1)
  })

  it('ficar parado ≥5 min na tela de fim conta como pausa real', () => {
    let s = run(initialTimer(45), { type: 'start', now: T0 }, { type: 'tick', now: T0 + 45 * MINUTE_MS })
    expect(s.focusedMs).toBe(45 * MINUTE_MS)
    s = timerReducer(s, { type: 'start', now: T0 + 46 * MINUTE_MS })
    expect(s.focusedMs).toBe(45 * MINUTE_MS)
    s = run(s, { type: 'tick', now: T0 + 91 * MINUTE_MS }, { type: 'start', now: T0 + 100 * MINUTE_MS })
    expect(s.focusedMs).toBe(0)
  })

  it('tick só gera estado novo quando o segundo muda', () => {
    const s = run(initialTimer(10), { type: 'start', now: T0 }, { type: 'tick', now: T0 + 1000 })
    expect(timerReducer(s, { type: 'tick', now: T0 + 1250 })).toBe(s)
  })

  it('formata o tempo em foco', () => {
    expect(formatFocused(HYPERFOCUS_MS)).toBe('1h30')
    expect(formatFocused(120 * MINUTE_MS)).toBe('2h')
    expect(formatFocused(45 * MINUTE_MS)).toBe('45 min')
  })
})
