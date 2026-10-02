# src/features — plano (Faísca)

Telas e fluxos montados **só** com `@/ui` (Lumen) + `@/store` / `@/domain` (Atlas).
Enquanto ui/ e store/ não existem, cada tela é um placeholder com o fluxo descrito em comentário.

```
features/
  navigation.ts         # tipos Tab e Overlay
  now/NowScreen.tsx     # Agora: 1 card com a próxima tarefa (useNextTask)  ✅
  now/useMorningSummaryToast.ts  # resumo da manhã 1x/dia  ✅
  game/reward.ts        # announceReward(reward, {title, undo}): toast XP + confete + som  ✅
  today/TodayScreen.tsx # Hoje: ritual "Planejar meu dia" + lista curta + progresso + missão
  inbox/InboxScreen.tsx # Caixa: Atrasadas · Esta semana · Depois · Sem data + triagem
  capture/              # botão flutuante + folha de captura + atalhos N / Ctrl+K
  focus/FocusMode.tsx   # tela cheia com anel de timer e micro-passos
  game/GameSheet.tsx    # folha aberta pelo XPOrb: nível, streak, combo, missão, conquistas
```

## Shell (App.tsx)
- Estado local `tab` + `AnimatePresence mode="wait"` entre telas (fade + leve deslize; springs de `@/ui/motion`).
- Topo: `XPOrb` (abre GameSheet). Rodapé: TabBar de vidro (3 abas). Sempre: botão flutuante de captura.
- Overlays globais: CaptureSheet, FocusMode (tela cheia), GameSheet. Só um aberto por vez.
- Atalhos globais: `N` (fora de campos de texto) e `Ctrl/⌘+K` abrem a captura. `Esc` fecha overlay.

## Agora (tela inicial) — UMA ação primária: **Começar**
1. `nextTask(tasks, now)` → tarefa ou nada.
2. Com tarefa: card de vidro grande (`layoutId` = id da tarefa) com título, `Countdown` (cor por `urgencyOf`),
   selo "Pedido da chefe", primeiro micro-passo não feito.
3. Ações: **Começar** (primária → Modo Foco) · Feito (ghost) · Pular por agora (ghost, sem punição).
4. Feito → saída animada + `+XP` flutuante + Toast; confete se subir de nível; próximo card entra com spring.
5. Pular → card desliza pro lado, próximo entra. Toast "Tudo bem, volta mais tarde".
6. Vazio → "Tudo limpo ✨" celebrativo + convite discreto a capturar.

## Captura rápida — sempre disponível
1. FAB (+) / `N` / `Ctrl+K` → Sheet com input único autofocado.
2. Enquanto digita: parser do Atlas → preview em Chips (prazo, urgente, da chefe, estimativa).
3. Enter → `addTask(parsed)`, fecha, Toast "Capturado ✓". Shift+Enter → captura e mantém aberto.
4. Esc / arrastar pra baixo → fecha sem salvar.

## Hoje — ação primária: **Planejar meu dia** (se ainda não planejou); senão, a lista
1. Sem plano → candidatas como cartas; escolher até **3 principais** (contador "2/3"; a 4ª é bloqueada com aviso gentil)
   + pequenas opcionais. Confirmar → planejar no store.
2. Com plano → progresso do dia + missão diária + lista curta ordenada (arrastar = `Reorder`).
3. Checkbox animado conclui com XP.

## Caixa — ação primária: triar o item tocado
1. Grupos: Atrasadas · Esta semana · Depois · Sem data.
2. Item expande (layout) com chips de prazo: Hoje · Amanhã · Sexta · Próx. semana; toggle "da chefe";
   "Quebrar em passos"; "Mandar pra Hoje".
3. Atrasadas: "Reagendar" com 1 toque (sem culpa, sem vermelho).

## Modo Foco — tela cheia
1. Fundo escurecido, tarefa + `ProgressRing` do timer (25 padrão; chips 10/15/25/45).
2. Micro-passos como Checkbox (+2 XP cada).
3. Fim do timer → "Concluiu? / +5 min / Pausa". Sessão completa = +5 XP.
4. 90 min sem pausa → aviso gentil.

## Gamificação (GameSheet)
- Nível + barra de XP, streak com escudo, combo atual, missão diária, grade de conquistas.
