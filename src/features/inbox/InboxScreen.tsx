// Caixa — Atrasadas · Esta semana · Depois · Sem data, com triagem rápida por item.
// TODO(integração): useTasks de @/store, agrupamento de @/domain, Chip/Glass de @/ui.

export function InboxScreen() {
  return (
    <section aria-labelledby="inbox-title" className="flex flex-col items-center gap-6 text-center">
      <h1 id="inbox-title" className="text-sm uppercase tracking-widest opacity-60">
        Caixa
      </h1>
      <p className="text-2xl font-semibold">Nada na caixa</p>
    </section>
  )
}
