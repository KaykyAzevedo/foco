# Foco

App de tarefas pensado para TDAH: em vez de um kanban cheio de opções, ele **decide o que fazer agora** e mostra uma coisa por vez.

- **Agora** — a próxima tarefa, escolhida por prazo, urgência e pedidos da chefe
- **Hoje** — ritual "Planejar meu dia" com no máximo 3 tarefas principais
- **Caixa** — tudo o que foi capturado, agrupado por prazo
- **Captura rápida** (`N` / `Ctrl+K`) em linguagem natural: `relatório amanhã 15h ! #chefe`
- **Modo Foco** com timer em anel e micro-passos
- **Gamificação**: XP, níveis, sequência com escudo, combo, missão diária e conquistas
- Lembretes por notificação, PWA instalável e offline, backup em JSON

Visual minimalista em liquid glass, com animações em spring, modo claro/escuro e suporte a "reduzir animações".

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes (Vitest)
npm run build      # build de produção
```

Stack: Vite, React 19, TypeScript, Tailwind CSS v4, Motion, Zustand, date-fns, vite-plugin-pwa.
Os dados ficam só no navegador (localStorage). Produto e arquitetura em [`docs/`](docs/).
