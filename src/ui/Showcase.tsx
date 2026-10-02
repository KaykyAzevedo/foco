import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Briefcase, CalendarDays, Clock, Inbox, Moon, Play, SkipForward, Sparkles, Sun, SunMedium, Zap } from 'lucide-react'
import {
  AppBackground,
  Button,
  Checkbox,
  Chip,
  Countdown,
  Glass,
  ProgressRing,
  Sheet,
  TabBar,
  UIProvider,
  XPOrb,
  fadeUp,
  stagger,
  toast,
} from './index'
import { useSettings } from '@/store'
import { useAppliedTheme } from './theme'

/** Vitrine do design system — para validação visual. Não é uma tela do app. */
export default function Showcase() {
  return (
    <UIProvider>
      <ShowcaseContent />
    </UIProvider>
  )
}

const H = 3_600_000

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section variants={fadeUp} style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
        {title}
      </h2>
      {children}
    </motion.section>
  )
}

const row = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } as const

function ShowcaseContent() {
  const resolved = useAppliedTheme()
  const setTheme = useSettings((s) => s.setTheme)
  const [tab, setTab] = useState<'agora' | 'hoje' | 'caixa'>('agora')
  const [sheet, setSheet] = useState(false)
  const [focus, setFocus] = useState(false)
  const [due, setDue] = useState<'hoje' | 'amanha' | 'sexta' | null>('hoje')
  const [checks, setChecks] = useState([false, true, false])
  const [xp, setXp] = useState({ level: 3, xp: 60 })
  const [progress, setProgress] = useState(0.35)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setProgress((p) => (p >= 1 ? 0.05 : p + 0.05)), 1200)
    return () => clearInterval(id)
  }, [])

  const addXp = (n: number) =>
    setXp((s) => (s.xp + n >= 100 ? { level: s.level + 1, xp: s.xp + n - 100 } : { ...s, xp: s.xp + n }))

  const iso = (ms: number) => new Date(now + ms).toISOString()

  return (
    <>
      <AppBackground tone={focus ? 'focus' : 'default'} />
      <motion.main
        variants={stagger(0.06)}
        initial="hidden"
        animate="show"
        style={{ maxWidth: 720, margin: '0 auto', padding: '28px 18px 140px', display: 'grid', gap: 32 }}
      >
        <motion.header variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700 }}>Foco UI</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-2)' }}>Liquid glass · springs · claro e escuro</p>
          </div>
          <div style={row}>
            <XPOrb level={xp.level} xp={xp.xp} xpToNext={100} onClick={() => setSheet(true)} />
            <Button
              variant="glass"
              iconOnly
              aria-label={resolved === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              icon={resolved === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
              onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
            />
          </div>
        </motion.header>

        <Section title="Agora — card principal">
          <Glass intensity="regular" radius="xl" style={{ padding: 24, display: 'grid', gap: 16 }}>
            <div style={row}>
              <Countdown due={iso(1.25 * H)} urgency="urgent" />
              <Chip tone="boss" size="sm" icon={<Briefcase aria-hidden />}>
                Pedido da chefe
              </Chip>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Enviar relatório de vendas</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>Primeiro passo: abrir a planilha de setembro</p>
            </div>
            <div style={row}>
              <Button size="lg" icon={<Play aria-hidden fill="currentColor" />}>
                Começar
              </Button>
              <Button variant="glass" size="lg" onClick={() => { addXp(15); toast.success({ title: 'Feito! +15 XP', description: 'Combo x1.2 🔥' }) }}>
                Feito
              </Button>
              <Button variant="ghost" icon={<SkipForward aria-hidden />}>
                Pular por agora
              </Button>
            </div>
          </Glass>
        </Section>

        <Section title="Botões">
          <div style={row}>
            <Button>Primário</Button>
            <Button variant="glass">Vidro</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="danger">Apagar</Button>
            <Button loading>Salvando</Button>
            <Button disabled>Desativado</Button>
            <Button size="sm" variant="glass" icon={<Clock aria-hidden />}>
              +5 min
            </Button>
            <Button iconOnly aria-label="Capturar" icon={<Sparkles aria-hidden />} />
          </div>
        </Section>

        <Section title="Chips">
          <div style={row}>
            {(
              [
                ['hoje', 'Hoje'],
                ['amanha', 'Amanhã'],
                ['sexta', 'Sexta'],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} selected={due === id} onClick={() => setDue(due === id ? null : id)}>
                {label}
              </Chip>
            ))}
            <Chip onClick={() => undefined} selected={false} icon={<CalendarDays aria-hidden />}>
              Próx. semana
            </Chip>
          </div>
          <div style={row}>
            <Chip tone="calm">Calmo</Chip>
            <Chip tone="soon">Atenção</Chip>
            <Chip tone="urgent" icon={<Zap aria-hidden />}>
              Urgente
            </Chip>
            <Chip tone="overdue">Passou</Chip>
            <Chip tone="boss">#chefe</Chip>
            <Chip tone="accent" onRemove={() => toast('Removido')}>
              ~15m
            </Chip>
          </div>
        </Section>

        <Section title="Contagem regressiva">
          <div style={row}>
            <Countdown due={iso(3 * 24 * H)} urgency="calm" />
            <Countdown due={iso(5 * H)} urgency="soon" />
            <Countdown due={iso(40 * 60_000)} urgency="urgent" />
            <Countdown due={iso(-25 * 60_000)} urgency="overdue" />
          </div>
          <div style={row}>
            <Countdown due={iso(2.5 * H)} urgency="soon" variant="inline" />
            <Countdown due={iso(90 * 60_000)} urgency="urgent" size="lg" />
          </div>
        </Section>

        <Section title="Progresso, XP e checklist">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <Glass style={{ padding: 20, display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center' }}>
              <ProgressRing progress={progress} size={96} label="Timer de foco" valueText={`${Math.round(progress * 100)}%`}>
                <span style={{ fontSize: 20 }}>{String(Math.round(25 * (1 - progress))).padStart(2, '0')}:00</span>
              </ProgressRing>
              <div style={{ display: 'grid', gap: 10 }}>
                <ProgressRing progress={0.66} size={40} tone="calm" />
                <ProgressRing progress={0.9} size={40} tone="urgent" />
              </div>
            </Glass>
            <Glass style={{ padding: 20, display: 'grid', gap: 12, placeItems: 'center' }}>
              <XPOrb level={xp.level} xp={xp.xp} size={72} />
              <div style={row}>
                <Button size="sm" variant="glass" onClick={() => addXp(5)}>
                  +5 XP
                </Button>
                <Button size="sm" onClick={() => addXp(40)}>
                  +40 XP
                </Button>
              </div>
            </Glass>
            <Glass style={{ padding: 20, display: 'grid', gap: 14 }}>
              {['Abrir a planilha', 'Filtrar setembro', 'Mandar pra chefe'].map((label, i) => (
                <Checkbox
                  key={label}
                  label={label}
                  checked={checks[i]}
                  tone={i === 2 ? 'calm' : 'accent'}
                  onChange={(v) => {
                    setChecks((c) => c.map((x, j) => (j === i ? v : x)))
                    if (v) addXp(2)
                  }}
                />
              ))}
            </Glass>
          </div>
        </Section>

        <Section title="Folha, toast e modo foco">
          <div style={row}>
            <Button variant="glass" onClick={() => setSheet(true)}>
              Abrir folha
            </Button>
            <Button variant="glass" onClick={() => toast('Capturado ✓')}>
              Toast simples
            </Button>
            <Button variant="glass" onClick={() => toast.xp({ title: '+10 XP', description: 'Tarefa urgente ×1.5' })}>
              Toast XP
            </Button>
            <Button
              variant="glass"
              onClick={() => toast({ title: 'Tarefa concluída', action: { label: 'Desfazer', onClick: () => toast('Desfeito') } })}
            >
              Com ação
            </Button>
            <Button variant={focus ? 'primary' : 'glass'} onClick={() => setFocus((f) => !f)}>
              {focus ? 'Sair do foco' : 'Fundo modo foco'}
            </Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {(['thin', 'regular', 'thick'] as const).map((k) => (
              <Glass key={k} intensity={k} radius="lg" style={{ padding: 18, minHeight: 80 }}>
                <strong>{k}</strong>
                <div style={{ color: 'var(--text-2)', fontSize: 13 }}>intensity</div>
              </Glass>
            ))}
            <Glass tint="calm" style={{ padding: 18 }}>
              <strong>tint calm</strong>
            </Glass>
            <Glass tint="overdue" interactive style={{ padding: 18 }}>
              <strong>tint overdue</strong>
              <div style={{ color: 'var(--text-2)', fontSize: 13 }}>interactive</div>
            </Glass>
          </div>
        </Section>
      </motion.main>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Seu progresso"
        footer={
          <Button fullWidth size="lg" onClick={() => setSheet(false)}>
            Continuar
          </Button>
        }
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <XPOrb level={xp.level} xp={xp.xp} size={64} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>Nível {xp.level}</div>
            <div style={{ color: 'var(--text-2)' }}>{100 - xp.xp} XP para o próximo nível</div>
          </div>
        </div>
        <p style={{ color: 'var(--text-2)', margin: 0 }}>
          Arraste a alça para baixo para fechar, aperte Esc ou toque fora. O foco fica preso aqui dentro.
        </p>
        <div style={{ ...row, marginTop: 16 }}>
          <Chip tone="calm">Sequência: 4 dias</Chip>
          <Chip tone="accent">1 escudo</Chip>
        </div>
      </Sheet>

      <TabBar
        value={tab}
        onChange={setTab}
        items={[
          { id: 'agora', label: 'Agora', icon: <SunMedium /> },
          { id: 'hoje', label: 'Hoje', icon: <CalendarDays /> },
          { id: 'caixa', label: 'Caixa', icon: <Inbox />, badge: 3 },
        ]}
      />
    </>
  )
}
