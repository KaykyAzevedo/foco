# Foco — produto

App pessoal de tarefas para uma pessoa com TDAH que esquece tarefas, perde noção de urgência e atrasa prazos.
Kanbans tradicionais falham porque mostram **opções demais**. O Foco faz o oposto: **decide por você o que fazer agora**.

## Princípios (inegociáveis)

1. **Uma coisa por vez.** A tela principal mostra UMA tarefa: a próxima. Nunca uma lista gigante.
2. **Zero decisões desnecessárias.** Cada tela tem no máximo 1 ação primária óbvia. Sem menus de configuração na cara.
3. **Capturar em 2 segundos.** Um campo de captura sempre acessível (botão flutuante + atalho `N` / `Ctrl+K`). Digitou, Enter, sumiu da cabeça.
4. **Urgência visível, não ansiosa.** Prazos viram contagem regressiva com cor (calmo → atenção → urgente). Nada de vermelho piscando.
5. **Recompensa imediata.** Concluir algo SEMPRE dá feedback: animação, XP, som opcional, confete em marcos.
6. **Perdoar falhas.** Atrasou? Sem culpa. O app oferece "reagendar com 1 toque" e a sequência (streak) tem "escudo" de 1 dia.
7. **Lindo.** Minimalista, liquid glass estilo Apple, animações fluidas (springs), modo claro e escuro.

## As 3 telas (navegação = só isso)

### 1. Agora (tela inicial)
- Card grande de vidro com a **próxima tarefa** (escolhida pelo algoritmo de prioridade, ver ARQUITETURA).
- Mostra: título, prazo em contagem regressiva, selo "Pedido da chefe" se for o caso, primeiro micro-passo.
- Ações: **Começar** (abre modo foco com timer), **Feito**, **Pular por agora** (vai pro fim da fila de hoje, sem punição).
- Se não houver nada: estado vazio celebrativo ("Tudo limpo ✨").

### 2. Hoje
- Ritual da manhã: **"Planejar meu dia"** — mostra tarefas candidatas como cartas; escolho no máximo **3 principais** (+ pequenas). Limite proposital.
- Lista curta do dia, ordenada pelo algoritmo, com arrastar para reordenar.
- Barra de progresso do dia + missão diária.

### 3. Caixa (inbox / tudo)
- Tudo que foi capturado e ainda não está em "Hoje". Agrupado por: Atrasadas · Esta semana · Depois · Sem data.
- Triagem rápida por item: definir prazo (chips: Hoje, Amanhã, Sexta, Próx. semana), marcar "da chefe", quebrar em passos.

## Captura rápida (sempre disponível)
- Input único com parser de linguagem natural em PT-BR:
  - `relatório vendas amanhã 15h !` → prazo amanhã 15:00, urgente
  - `ligar fornecedor sexta #chefe` → prazo sexta, pedido da chefe
  - `!` = urgente, `#chefe` = pedido da chefe, `~15m` = estimativa
- Mostra preview dos chips detectados enquanto digita.

## Modo Foco
- Tela cheia, fundo escurecido, só a tarefa + anel de timer (padrão 25 min; opções 10/15/25/45).
- Micro-passos como checklist (marcar cada um dá XP pequeno).
- Ao terminar o timer: "Concluiu? / +5 min / Pausa".
- Contra o hiperfoco: aviso gentil após 90 min sem pausa.

## Gamificação
- **XP**: concluir tarefa = 10 XP base; ×1.5 se urgente; ×2 se concluída antes do prazo e da chefe; micro-passo = 2 XP; sessão de foco completa = 5 XP.
- **Níveis** com curva suave; subir de nível = animação + confete.
- **Sequência (streak)**: dias com ≥1 tarefa concluída. 1 escudo por semana protege um dia perdido.
- **Combo**: concluir tarefas em sequência dentro de 30 min aumenta multiplicador (x1.2, x1.5…).
- **Missão diária**: 1 desafio simples (ex.: "Conclua 1 tarefa da chefe antes do almoço").
- **Conquistas** (badges): "Primeira tarefa", "Semana sem atraso", "Madrugador", etc.
- Tudo discreto: um "orb" de XP no topo; detalhes em uma folha (sheet) ao tocar.

## Lembretes
- Notificações do navegador (Notification API / PWA): 1 dia antes, 1 hora antes e no prazo.
- Resumo da manhã ao abrir o app: "Hoje você tem 2 da chefe e 1 prazo às 15h".

## Fora do escopo (v1)
Contas, sincronização na nuvem, colaboração, integrações. Dados ficam locais (localStorage), com exportar/importar JSON.
