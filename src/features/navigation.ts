export type Tab = 'now' | 'today' | 'inbox'

/** Overlays globais — só um aberto por vez. */
export type Overlay = { kind: 'capture' } | { kind: 'focus'; taskId: string } | { kind: 'game' } | { kind: 'settings' } | null
