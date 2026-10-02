// Hoje — ritual "Planejar meu dia" (máx. 3 principais) + lista curta + progresso + missão.
// TODO(integração): useTasks de @/store, ProgressRing/Checkbox de @/ui, Reorder de motion.

export function TodayScreen() {
  return (
    <section aria-labelledby="today-title" className="flex flex-col items-center gap-6 text-center">
      <h1 id="today-title" className="text-sm uppercase tracking-widest opacity-60">
        Hoje
      </h1>
      <p className="text-2xl font-semibold">Planejar meu dia</p>
    </section>
  )
}
