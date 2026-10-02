// Modelo de dados do Foco. Ver docs/ARQUITETURA.md.

export type Urgency = 'calm' | 'soon' | 'urgent' | 'overdue'

export interface Step {
  id: string
  title: string
  done: boolean
  /** já rendeu XP uma vez (desmarcar e marcar de novo não paga de novo) */
  rewarded?: boolean
}

export interface Task {
  id: string
  title: string
  notes?: string
  /** ISO */
  createdAt: string
  /** ISO (data+hora) */
  due?: string
  estimateMin?: number
  /** marcado com "!" */
  urgent: boolean
  /** "pedido da chefe" */
  fromBoss: boolean
  /** 'YYYY-MM-DD' se está em "Hoje" */
  plannedFor?: string
  /** uma das 3 principais do dia */
  isMain?: boolean
  steps: Step[]
  doneAt?: string
  /** ISO da primeira conclusão que rendeu XP (re-concluir após "Desfazer" não paga de novo) */
  rewardedAt?: string
  /** "pular por agora" */
  skippedAt?: string
  /** ordem manual em Hoje */
  order?: number
}

/** Dia local no formato 'YYYY-MM-DD'. */
export type DayKey = string

// ---------- Captura ----------

export type CaptureChipKind = 'due' | 'urgent' | 'boss' | 'estimate'

export interface CaptureChip {
  kind: CaptureChipKind
  /** Texto pronto para exibir, ex.: "amanhã 15:00", "Urgente", "Da chefe", "~15 min" */
  label: string
  /** Trecho original reconhecido no texto */
  raw: string
}

export interface ParsedCapture {
  title: string
  due?: string
  urgent: boolean
  fromBoss: boolean
  estimateMin?: number
  chips: CaptureChip[]
}

// ---------- Gamificação ----------

export interface StreakState {
  /** dias consecutivos com ≥1 tarefa concluída */
  count: number
  best: number
  /** último dia com atividade */
  lastDay?: DayKey
  /** escudos disponíveis (0 ou 1) */
  shields: number
  /** semana ISO ('YYYY-Www') em que o escudo foi recarregado pela última vez */
  shieldWeek?: string
  /** dias que foram salvos por um escudo */
  shieldedDays: DayKey[]
}

export interface ComboState {
  count: number
  /** ISO da última conclusão */
  lastAt?: string
}

export interface GameStats {
  tasksCompleted: number
  bossCompleted: number
  stepsCompleted: number
  focusSessions: number
  daysPlanned: number
  bestCombo: number
}

export interface DailyLog {
  day: DayKey
  focusSessions: number
  missionDone: boolean
  /** ritual "Planejar meu dia" já recompensado hoje */
  planned: boolean
}

export interface GameState {
  xp: number
  streak: StreakState
  combo: ComboState
  stats: GameStats
  /** registro do dia corrente (missão / sessões de foco) */
  today: DailyLog
  /** id → ISO de quando foi desbloqueada */
  achievements: Record<string, string>
}

export interface LevelInfo {
  level: number
  /** XP acumulado dentro do nível atual */
  current: number
  /** XP necessário para passar do nível atual ao próximo */
  needed: number
  /** 0..1 */
  progress: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  /** emoji para exibir no badge */
  icon: string
}

export interface Mission {
  id: string
  title: string
  target: number
  rewardXp: number
}

export interface MissionProgress {
  mission: Mission
  progress: number
  target: number
  done: boolean
}

export type RewardKind = 'task' | 'step' | 'focus' | 'plan'

export interface Reward {
  kind: RewardKind
  /** XP total ganho neste evento (inclui bônus de missão) */
  xp: number
  /** explicação curta, ex.: ["Tarefa +10", "Urgente ×1.5", "Combo ×1.2"] */
  breakdown: string[]
  combo: number
  comboMultiplier: number
  streak: number
  /** usou o escudo para salvar a sequência */
  shieldUsed: boolean
  levelBefore: number
  levelAfter: number
  leveledUp: boolean
  missionCompleted?: Mission
  unlocked: Achievement[]
  /** true quando é uma re-conclusão (após Desfazer): xp 0, sem combo/missão/conquista */
  repeat: boolean
  /** ISO */
  at: string
}

// ---------- Configurações ----------

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  theme: ThemePref
  sound: boolean
  notifications: boolean
  /** duração padrão do modo foco (10/15/25/45) */
  focusMinutes: number
  /** último dia em que o resumo da manhã foi mostrado */
  lastMorningSummary?: DayKey
}
