# Foco — arquitetura

App web **local-first** (sem backend na v1), instalável como PWA.

## Stack
- **Vite + React 19 + TypeScript** (strict)
- **Tailwind CSS v4** (`@tailwindcss/vite`) + CSS custom properties para tokens de design
- **motion** (Framer Motion) — `import { motion, AnimatePresence } from 'motion/react'`
- **zustand** + middleware `persist` (localStorage) — estado global
- **date-fns** (locale `ptBR`) — datas
- **lucide-react** — ícones; **canvas-confetti** — celebrações; **clsx** — classes
- **Vitest + Testing Library** — testes
- Alias de import: `@/` → `src/`

Comandos: `npm run dev` · `npm run build` · `npm test` · `npm run typecheck`

## Estrutura de pastas e DONOS (evitar conflitos!)

```
src/
  domain/      # lógica pura, sem React. Tipos, prioridade, parser, XP.     → DONO: Atlas (domínio)
    types.ts
    priority.ts        # algoritmo "qual é a próxima tarefa"
    parser.ts          # captura em linguagem natural PT-BR
    gamification.ts    # XP, níveis, streak, combo, conquistas
    *.test.ts          # testes unitários obrigatórios
  store/       # zustand stores (useTasks, useGame, useSettings)        → DONO: Atlas
  lib/         # utilitários (datas, notificações, som, confete)          → DONO: Atlas
  ui/          # design system: tokens, Glass, Button, Sheet, Chip, Ring  → DONO: Lumen (design)
    tokens.css
  features/    # telas e fluxos montados com ui/ + store/                 → DONO: Faísca (telas)
               #   exceção: features/focus/ e features/game/          → DONO: Lumen
  public/, PWA (manifest, service worker)                             → DONO: Atlas
    now/  today/  inbox/  capture/  focus/  game/
  App.tsx      # shell + navegação (tab bar de vidro)                     → DONO: Faísca
```

Regra: **só edite arquivos da sua área**. Precisa de algo em outra área? Peça ao dono via `maestri ask`.
Exceção: `package.json` — avise o orquestrador antes de adicionar dependência.

## Modelo de dados (src/domain/types.ts)

```ts
type Urgency = 'calm' | 'soon' | 'urgent' | 'overdue'
interface Step { id: string; title: string; done: boolean }
interface Task {
  id: string
  title: string
  notes?: string
  createdAt: string        // ISO
  due?: string             // ISO (data+hora)
  estimateMin?: number
  urgent: boolean          // marcado com "!"
  fromBoss: boolean        // "pedido da chefe"
  plannedFor?: string      // 'YYYY-MM-DD' se está em "Hoje"
  isMain?: boolean         // uma das 3 principais do dia
  steps: Step[]
  doneAt?: string
  skippedAt?: string       // "pular por agora"
  order?: number           // ordem manual em Hoje
}
```

## Algoritmo de prioridade (domain/priority.ts)
Função pura `score(task, now)` → número; `nextTask(tasks, now)` → Task | undefined.
Pesos sugeridos: atrasada +100 · prazo < 2h +60 · prazo hoje +40 · amanhã +20 · fromBoss +35 · urgent +30 ·
isMain +25 · planejada pra hoje +15 · pulada recentemente −50 · tarefa curta (≤15 min) +5 (vitória rápida).
`urgencyOf(task, now)` → Urgency (para cor/contagem regressiva).

## Design system (ui/)
- Liquid glass: `backdrop-filter: blur(24px) saturate(180%)`, fundo translúcido, borda 1px de luz, sombra suave,
  realce especular sutil no topo. Fundo do app = gradiente "mesh" animado bem lento.
- Tokens em `ui/tokens.css`: cores (calm/soon/urgent/overdue, accent), raios (16/24/32), blur, sombras, tipografia
  (SF Pro / `-apple-system`, fallback Inter), springs padronizados exportados em `ui/motion.ts`.
- Claro/escuro via `prefers-color-scheme` + toggle.
- Respeitar `prefers-reduced-motion`.
- Componentes mínimos: `Glass`, `Button` (primary/ghost), `Chip`, `Sheet` (bottom sheet arrastável), `TabBar`,
  `ProgressRing`, `Countdown`, `XPOrb`, `Toast`, `Checkbox` animado.

## Fluxo do time
1. **Orquestrador** (Claude Code) — dono do plano, integra, decide conflitos.
2. **Lumen** (design system) e **Atlas** (domínio/estado) trabalham em paralelo primeiro.
3. **Faísca** (telas) monta as features usando ui/ + store/ (pode começar com stubs).
4. **Sentinela** (QA) revisa cada entrega: build, testes, acessibilidade, aderência a PRODUTO.md, e testa no navegador.
Antes de dizer "pronto": `npm run typecheck && npm test && npm run build` precisam passar.
