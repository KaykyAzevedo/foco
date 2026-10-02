# Domínio, estado e lib — API (Atlas)

Três camadas, todas importáveis com o alias `@/`:

| Pasta | O quê | Importe de |
|---|---|---|
| `src/domain/` | Lógica pura (sem React). Sempre recebe `now: Date`. | `@/domain` |
| `src/store/` | Stores zustand com `persist` + hooks derivados para as telas. | `@/store` |
| `src/lib/` | Efeitos do navegador: notificações, confete, som, backup, `useNow`. | `@/lib/<arquivo>` |

Regras: datas são **ISO strings** (`Task.due`, `doneAt`…); dias são `DayKey` `'YYYY-MM-DD'` (fuso local).
Nas ações dos stores `now` é opcional (padrão `new Date()`), só para testes.

---

## Hooks prontos para as telas (`@/store`)

Recalculam sozinhos quando as tarefas mudam e a cada 30 s (via `useNow`).

```ts
useNextTask(): Task | undefined                    // tela Agora
useToday(): { tasks: Task[]; progress: DayProgress; planned: boolean; candidates: Task[] }
useInbox(): { overdue: Task[]; thisWeek: Task[]; later: Task[]; noDate: Task[] }   // Caixa
useMorningSummary(): { fromBoss; dueToday; overdue; nextDue?; text }               // "Hoje você tem 2 da chefe e 1 prazo às 15h."
useGameSummary(): {
  xp: number
  level: { level; current; needed; progress /* 0..1 */ }
  streak: number; bestStreak: number; streakAtRisk: boolean; shields: number
  combo: number                                   // 0 se expirou
  mission: { mission: { id; title; target; rewardXp }; progress; target; done }
  achievements: Array<Achievement & { unlockedAt?: string }>
}
```

## `useTasks`

```ts
const tasks = useTasks((s) => s.tasks)
const { capture, complete, skip } = useTasks.getState()
```

| Ação | Assinatura | Notas |
|---|---|---|
| `capture` | `(text: string) => Task \| undefined` | Faz o parse PT-BR e cria. Texto vazio → `undefined`. |
| `add` / `addTask` | `(input: NewTaskInput) => Task` | Aceita direto o retorno de `parseCapture` (chips são ignorados). `steps` pode ser `string[]`. |
| `update` / `updateTask` | `(id, patch: Partial<Task>) => void` | |
| `complete` / `completeTask` | `(id) => Reward \| undefined` | **Devolve a recompensa** (XP, nível, conquistas, missão). `undefined` se já feita/inexistente. |
| `uncomplete` | `(id) => void` | Para "Desfazer". Não retira XP — e re-concluir depois rende **xp 0** (anti-farm, ver abaixo). |
| `skip` / `skipTask` | `(id) => void` | "Pular por agora": vai para o fim da fila de hoje. |
| `reschedule` / `rescheduleTask` | `(id, due: string \| undefined) => void` | Reagendar com 1 toque (limpa o "pulado"). |
| `plan` | `({ main: string[], extra?: string[] }) => Reward` | Ritual "Planejar meu dia". Máx. 3 principais (excedente ignorado). **Substitui** o plano de hoje (abertas que saíram voltam para a Caixa). Define `order`. |
| `planToday` | `(mainIds, smallIds?) => Reward` | Alias de `plan`. |
| `addToToday` | `(id, now?, isMain?) => void` | Joga uma tarefa no fim de Hoje. |
| `removeFromToday` | `(id) => void` | |
| `reorder` / `reorderToday` | `(ids: string[]) => void` | Ordem manual (arrastar). `order = índice`. |
| `toggleStep` / `completeStep` | `(taskId, stepId) => Reward \| undefined` | Alterna; recompensa só quando marca como feito (xp 0 se o passo já tinha rendido). |
| `addStep` | `(taskId, title) => Step \| undefined` | |
| `updateStep` | `(taskId, stepId, title) => void` | |
| `removeStep` | `(taskId, stepId) => void` | |
| `remove` | `(id) => void` | |
| `restore` | `(task: Task) => void` | Desfazer de Apagar: reinsere com o mesmo id (no-op se o id já existe). |
| `replaceAll` | `(tasks) => void` | Usado pelo importar. |

## `useGame`

Estado: `xp`, `streak` (`StreakState`), `combo`, `stats`, `today` (registro do dia), `achievements` (`id → ISO`),
`lastReward?: Reward`. Prefira `useGameSummary()` para exibir.

| Ação | Uso |
|---|---|
| `focusCompleted(): Reward` | **Chamar quando o timer do Modo Foco termina.** +5 XP. |
| `clearReward()` | Depois de mostrar toast/confete de `lastReward`. |
| `touchDay()` | Opcional ao abrir o app (vira o registro diário). |
| `reset()` / `replace(state)` | Configurações / importar. |

`taskCompleted`, `stepCompleted`, `dayPlanned` são chamados internamente pelo `useTasks`.

### `Reward` (o que celebrar)

```ts
{
  kind: 'task' | 'step' | 'focus' | 'plan'
  xp: number                 // total do evento (inclui bônus de missão)
  breakdown: string[]        // ["Tarefa +10", "Urgente ×1.5", "Combo ×1.2", "Missão +15"]
  combo: number; comboMultiplier: number
  streak: number; shieldUsed: boolean
  levelBefore: number; levelAfter: number; leveledUp: boolean
  missionCompleted?: Mission
  unlocked: Achievement[]    // { id, title, description, icon (emoji) }
  repeat: boolean            // true = re-conclusão (Feito → Desfazer → Feito): xp 0, sem combo/missão/conquista
  at: string
}
```

**Anti-farm:** cada tarefa/passo paga XP só uma vez (`Task.rewardedAt`, `Step.rewarded`). Re-concluir devolve
`Reward` com `xp: 0` e `repeat: true` (nunca `undefined`), para a UI ainda dizer "Feito!" — sugestão: não mostrar "+0 XP".

Padrão sugerido:

```ts
import { celebrateReward } from '@/lib/confetti'
import { playChime } from '@/lib/sound'
const reward = useTasks.getState().complete(task.id)
if (reward) {
  celebrateReward(reward)                 // confete só em marcos: nível, conquista, missão
  if (useSettings.getState().sound) playChime(reward.leveledUp ? 'level' : 'done')
  toast(`+${reward.xp} XP`)
}
```

## `useSettings`

`theme: 'system'|'light'|'dark'` (**fonte única de verdade do tema** — o `useAppliedTheme()` de `@/ui` só lê; para trocar o tema chame `setTheme`), `sound`, `notifications`, `focusMinutes` (padrão 25; `FOCUS_OPTIONS = [10,15,25,45]`),
`lastMorningSummary?: DayKey`.
Ações: `setTheme`, `setSound`, `setNotifications`, `setFocusMinutes`, `markMorningSummary(day)`, `update(patch)`, `reset()`.

Persistência (localStorage): `foco:tasks`, `foco:game`, `foco:settings` (versão 1).

---

## Domínio puro (`@/domain`)

### Prioridade — `priority.ts`
- `score(task, now): number` — pesos em `WEIGHTS` (atrasada +100 · <2h +60 · hoje +40 · amanhã +20 · chefe +35 · "!" +30 · principal de hoje +25 · planejada hoje +15 · pulada hoje −50 · ≤15 min +5). Faixas de prazo são exclusivas. Concluída = `-Infinity`.
- `nextTask(tasks, now): Task | undefined` — puladas hoje vão **sempre** para o fim (a pulada há mais tempo volta primeiro). Desempate: prazo → `order` → criação.
- `sortByPriority(tasks, now)`, `compareTasks(a, b, now)`
- `urgencyOf(task, now): 'calm'|'soon'|'urgent'|'overdue'` — overdue: passou · urgent: <2h · soon: <24h · calm. "!" sobe um degrau (sem prazo + "!" = soon).
- `isOverdue`, `isDone`, `isSkippedToday`, `msUntilDue`

### Captura — `parser.ts`
`parseCapture(text, now, { defaultHour? }): ParsedCapture`

```ts
{ title, due?, urgent, fromBoss, estimateMin?, chips: { kind: 'due'|'urgent'|'boss'|'estimate'; label; raw }[] }
```

Reconhece (sem diferenciar maiúsculas/acentos):
- **Datas:** `hoje`, `hj`, `amanhã/amanha`, `depois de amanhã`, `segunda`…`domingo` (com/sem `-feira`; sempre a **próxima** ocorrência — dizer "sexta" numa sexta = semana que vem), `próxima sexta`, `semana que vem`/`próxima semana` (segunda), `dd/mm`, `dd/mm/aa(aa)` (dd/mm passado → ano que vem), `dia 15`.
- **Horas:** `15h`, `15h30`, `15hs`, `15:30`, `às 9h`, `3h da tarde`, `8h da noite`, `meio-dia`, `meia-noite`.
- **Marcadores:** `!` (sozinho, `!palavra` ou `palavra!`) = urgente · `#chefe` = da chefe · `~15m`, `~1h`, `~1h30`, `~1,5h`, `~20` = estimativa.
- Preposições coladas (`até`, `para`, `pra`, `na`, `no`, `dia`, `às`…) somem do título.
- Só data → `defaultHour` (18h); se já passou hoje → 23:59. Só hora → hoje; se já passou → amanhã.
- Datas/horas inválidas (`31/02`, `25h`) ficam no título. Se sobrar título vazio, usa o texto original.
- `chips[0]` é sempre o prazo (quando há) com `label` pronto: "amanhã 15h", "sexta 18h".

### Seletores — `selectors.ts`
`todayTasks(tasks, now, day?)`, `dayProgress(tasks, day) → { done, total, ratio }`, `doneOn(tasks, day)`,
`inboxGroups(tasks, now)` (Esta semana = próximos 7 dias; exclui Hoje e concluídas; planejadas de dias passados voltam pra Caixa),
`planningCandidates(tasks, now)`, `isDayPlanned(tasks, now)`, `morningSummary(tasks, now)`, `MAX_MAIN = 3`.

### Formatação — `format.ts`
- `formatCountdown(due, now)` → "em 45 min", "em 2h 10min", "em 3 dias", "agora", "passou há 20 min" (tom sem culpa — fonte única do Countdown)
- `formatDue(due, now)` → "hoje 15h", "amanhã 9h30", "ontem 18h", "terça 18h", "20/10 18h" (23:59 = sem hora)
- `formatHour(d)` → "15h", "8h05" · `formatEstimate(min)` → "15 min", "1h 30min"

### Gamificação — `gamification.ts`
- `XP` = `{ task: 10, urgentMultiplier: 1.5, earlyBossMultiplier: 2, step: 2, focusSession: 5, planDay: 5 }`
- `xpForTask(task, now, combo?) → { base, multiplier, total, breakdown }` — ×2 só se **da chefe E antes do prazo**.
- `levelFromXp(xp) → { level, current, needed, progress }` · `xpToNext(level)` (50, 75, 100…) · `xpForLevel(level)`
- Combo: `comboMultiplier(n)` (1, 1.2, 1.5, 1.75, 2), `nextCombo`, `activeCombo(combo, now)`; janela 30 min.
- Sequência: `registerActivity(streak, day)`, `currentStreak(streak, today)`, `streakAtRisk`, `shieldsAvailable` — 1 escudo por semana ISO salva exatamente 1 dia perdido.
- Missão: `missionForDay(day)` (determinística), `missionProgress({ tasks, day, focusSessionsToday })`. Bônus 15 XP, uma vez por dia.
- Conquistas: `allAchievements()`, `newAchievements(ctx)` — primeira tarefa, 10/50/100, braço direito (10 da chefe), madrugador, coruja, sequência 3/7/30, semana sem atraso, em chamas (combo 5), mente zen (10 focos), passo a passo (25 passos), estrategista (5 planejamentos), nível 5/10.
- Eventos puros (usados pelos stores): `onTaskCompleted`, `onStepCompleted`, `onFocusCompleted`, `onDayPlanned` → `{ state, reward }`.

### Datas — `dates.ts`
`dayKey(d)`, `fromDayKey`, `addDaysKey`, `daysBetween`, `weekKey`, `atTime`, `toDate`, `MINUTE/HOUR/DAY`.

---

## Lib (`@/lib/...`)

- **`notifications.ts`**: `enableReminders()` (pede permissão + liga `useSettings.notifications`; para o botão dos ajustes),
  `sendTestNotification()`, `requestNotificationPermission()`, `notificationPermission()`,
  `notify(title, body, tag?) → Promise<boolean>` (via service worker quando existe: funciona com a aba em segundo plano
  e no app instalado; tocar na notificação foca/abre o Foco), `remindersFor(task)` (1 dia antes, 1 h antes, no prazo),
  `dueReminders(...)` (puro), `startReminderLoop(getTasks?, { isEnabled?, intervalMs?, onReminder? }) → stop`
  (padrões: tarefas do `useTasks` e `useSettings.notifications`; checa de novo ao voltar para a aba).
  Limitação: com o app/navegador **totalmente fechado** não há lembrete (exigiria push com servidor — fora do escopo v1).
- **`pwa.ts`**: `useInstallPrompt() → { canInstall, install, standalone, iosHint }` para um botão "Instalar o Foco"
  (`iosHint`: mostrar "Compartilhar → Adicionar à Tela de Início"); também `promptInstall()`, `canInstall()`, `isStandalone()`.
- **`confetti.ts`**: `celebrate(kind)`, `celebrateReward(reward)`, `celebrationFor(reward)` — respeita `prefers-reduced-motion`.
- **`sound.ts`**: `playChime('done' | 'level')` (WebAudio, sem arquivos).
- **`backup.ts`** (tela de ajustes):
  - Exportar: `downloadBackup()` → baixa `foco-backup-AAAA-MM-DD.json`.
  - Importar com confirmação: `readBackupFile(file) → { ok: true, backup } | { ok: false, error }` (não aplica) →
    `backupSummary(backup).text` ("12 tarefas (3 abertas) · nível 4 · salvo em 02/10/2026 às 11h30") →
    `restoreBackup(backup)`. Ou direto: `importBackupFile(file)`.
  - `resetAllData()` apaga tudo (peça confirmação antes).
  - Puros: `createBackup`, `serializeBackup`, `parseBackup` (descarta itens inválidos; mensagens de erro em PT-BR).
- **`useNow.ts`**: `useNow(intervalMs = 30000): Date` — para contagens regressivas.
- **`id.ts`**: `uid()`.

---

## PWA (dono: Atlas)

- `vite-plugin-pwa` (`generateSW`, `registerType: 'autoUpdate'`, registro injetado automaticamente — nada a fazer no React).
- Manifest: nome/short_name "Foco", `lang: pt-BR`, standalone, `theme_color #5856d6`, `background_color #eef0f8`.
- Ícones em `public/icons/` (192, 512, maskable 512, apple-touch 180, SVG) + `public/favicon.svg`/`favicon-32.png`.
- Offline: todo o app (JS/CSS/HTML/ícones) fica em cache; navegação cai em `/index.html`.
- `public/sw-notifications.js` (importado pelo SW): clique na notificação foca a aba do Foco ou abre uma nova
  e envia `postMessage({ type: 'foco:notification-click', tag })` para a página.
- O SW só existe no build (`npm run build && npm run preview`); em `npm run dev` está desligado.
