export interface AppBackgroundProps {
  /** 'focus' escurece o fundo (modo foco). Padrão: 'default'. */
  tone?: 'default' | 'focus'
}

/**
 * Fundo "mesh" animado bem devagar (só transform, barato para a GPU) + granulado sutil.
 * Fica fixo atrás de tudo (z-index -1). Monte uma vez na raiz.
 * Com prefers-reduced-motion, fica parado.
 */
export function AppBackground({ tone = 'default' }: AppBackgroundProps) {
  return (
    <div className="ui-mesh" data-tone={tone} aria-hidden>
      <div className="ui-mesh-blob" />
      <div className="ui-mesh-blob" />
      <div className="ui-mesh-blob" />
      <div className="ui-mesh-blob" />
      <div className="ui-mesh-blob" />
      <div className="ui-mesh-grain" />
      <div className="ui-mesh-dim" />
    </div>
  )
}
