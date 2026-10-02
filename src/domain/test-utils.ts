// Utilitários só para testes do domínio/store (não usar na UI).
import type { Task } from './types'

/** Sexta-feira, 2 de outubro de 2026, 10:00 (hora local). */
export const NOW = new Date(2026, 9, 2, 10, 0)

let seq = 0
export function makeTask(partial: Partial<Task> = {}): Task {
  seq++
  return {
    id: partial.id ?? `t${seq}`,
    title: partial.title ?? `Tarefa ${seq}`,
    createdAt: partial.createdAt ?? new Date(2026, 8, 1, 9, 0, seq).toISOString(),
    urgent: false,
    fromBoss: false,
    steps: [],
    ...partial,
  }
}

/** Data local → ISO. */
export function at(y: number, m: number, d: number, h = 0, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString()
}
