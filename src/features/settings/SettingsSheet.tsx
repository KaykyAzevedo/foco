// Ajustes — poucas opções, linguagem simples. Abre pelo ícone de engrenagem no topo (não é uma 4ª aba).
// Lembretes · Aparência (tema, som, animações) · Instalar (se disponível) · Backup.
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, BellOff, Download, MonitorSmartphone, Moon, Smartphone, Sun, Upload } from 'lucide-react'
import type { ThemePref } from '@/domain'
import { backupSummary, downloadBackup, readBackupFile, restoreBackup, type Backup } from '@/lib/backup'
import { enableReminders, notificationPermission, sendTestNotification } from '@/lib/notifications'
import { useInstallPrompt } from '@/lib/pwa'
import { playChime } from '@/lib/sound'
import { useSettings } from '@/store'
import { Button, Checkbox, Segmented, Sheet, springs, toast, type SegmentedOption } from '@/ui'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsSheet({ open, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      <div className="flex flex-col gap-6 pb-4">
        <Reminders />
        <Appearance />
        <Install />
        <BackupSection />
      </div>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-xs font-semibold tracking-wide text-text-2 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

// ---------- Lembretes ----------

function Reminders() {
  const enabled = useSettings((s) => s.notifications)
  const setNotifications = useSettings((s) => s.setNotifications)
  // a permissão do navegador não é reativa: relemos depois de pedir
  const [permission, setPermission] = useState(notificationPermission)
  const [asking, setAsking] = useState(false)
  // ligar/desligar troca os botões: o foco vai pro botão que aparece no lugar
  const focusFlag = useRef(false)
  const activateRef = useRef<HTMLButtonElement>(null)
  const testRef = useRef<HTMLButtonElement>(null)
  const blockedRef = useRef<HTMLParagraphElement>(null)

  async function activate() {
    setAsking(true)
    const result = await enableReminders()
    setAsking(false)
    // o botão some em qualquer resultado: o foco vai pro que aparece no lugar
    focusFlag.current = true
    setPermission(result)
    if (result === 'granted') {
      toast.success('Lembretes ativados ✨')
      void sendTestNotification()
    } else if (result === 'denied') {
      toast.warning('O navegador bloqueou os lembretes.')
    }
  }

  const on = enabled && permission === 'granted'

  useEffect(() => {
    if (!focusFlag.current) return
    focusFlag.current = false
    const target = on ? testRef : permission === 'denied' ? blockedRef : activateRef
    target.current?.focus({ preventScroll: true })
  }, [on, permission])

  return (
    <Section title="Lembretes">
      {permission === 'unsupported' ? (
        <p className="text-sm text-text-2">Este navegador não mostra lembretes. Instalar o app pode ajudar.</p>
      ) : permission === 'denied' ? (
        <p ref={blockedRef} tabIndex={-1} className="flex items-start gap-2 text-sm text-text-2 outline-none">
          <BellOff aria-hidden size={18} className="mt-0.5 shrink-0" />
          Bloqueados pelo navegador. Para ligar, libere as notificações nas permissões deste site.
        </p>
      ) : on ? (
        <>
          <p className="flex items-start gap-2 text-sm">
            <Bell aria-hidden size={18} className="mt-0.5 shrink-0 text-calm-ink" />
            Ligados. Aviso 1 dia antes, 1 hora antes e na hora do prazo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button ref={testRef} variant="glass" size="sm" onClick={() => void sendTestNotification()}>
              Testar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                focusFlag.current = true
                setNotifications(false)
              }}
            >
              Desligar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-text-2">
            Te aviso 1 dia antes, 1 hora antes e na hora do prazo. Só isso, nada de spam.
          </p>
          <Button
            ref={activateRef}
            variant="primary"
            icon={<Bell aria-hidden size={18} />}
            loading={asking}
            onClick={() => void activate()}
          >
            Ativar lembretes
          </Button>
        </>
      )}
    </Section>
  )
}

// ---------- Aparência ----------

const THEMES: SegmentedOption<ThemePref>[] = [
  { id: 'system', label: 'Automático', icon: <MonitorSmartphone aria-hidden size={14} /> },
  { id: 'light', label: 'Claro', icon: <Sun aria-hidden size={14} /> },
  { id: 'dark', label: 'Escuro', icon: <Moon aria-hidden size={14} /> },
]

function Appearance() {
  const theme = useSettings((s) => s.theme)
  const setTheme = useSettings((s) => s.setTheme)
  const sound = useSettings((s) => s.sound)
  const setSound = useSettings((s) => s.setSound)
  const reduceMotion = useSettings((s) => s.reduceMotion)
  const setReduceMotion = useSettings((s) => s.setReduceMotion)

  return (
    <Section title="Aparência">
      <Segmented options={THEMES} value={theme} onChange={setTheme} aria-label="Tema" />
      <Checkbox
        checked={sound}
        strike={false}
        onChange={(on) => {
          setSound(on)
          if (on) playChime('done') // prévia do som
        }}
        label="Som ao concluir"
      />
      <Checkbox checked={reduceMotion} strike={false} onChange={setReduceMotion} label="Reduzir animações" />
    </Section>
  )
}

// ---------- Instalar ----------

function Install() {
  const { canInstall, install, standalone, iosHint } = useInstallPrompt()
  if (standalone || (!canInstall && !iosHint)) return null

  return (
    <Section title="Instalar">
      {canInstall ? (
        <>
          <p className="text-sm text-text-2">Abre como um app, direto da tela inicial, e os lembretes funcionam melhor.</p>
          <Button
            variant="glass"
            icon={<Smartphone aria-hidden size={18} />}
            onClick={async () => {
              if ((await install()) === 'accepted') toast.success('Foco instalado 🎉')
            }}
          >
            Instalar o Foco
          </Button>
        </>
      ) : (
        <p className="text-sm text-text-2">
          No iPhone: toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}
    </Section>
  )
}

// ---------- Backup ----------

function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState<Backup>()
  const hadPending = useRef(false)

  // confirmação aparece → foco no "Cancelar" (opção segura); some → volta pro "Importar"
  useEffect(() => {
    if (pending) cancelRef.current?.focus({ preventScroll: true })
    else if (hadPending.current) importRef.current?.focus({ preventScroll: true })
    hadPending.current = !!pending
  }, [pending])

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    const result = await readBackupFile(file)
    if (result.ok) setPending(result.backup)
    else toast.warning({ title: 'Não deu pra ler esse arquivo', description: result.error })
  }

  function confirmRestore() {
    if (!pending) return
    restoreBackup(pending)
    // o backup pode vir de outro aparelho com lembretes ligados; aqui só valem se houver permissão
    const settings = useSettings.getState()
    if (settings.notifications && notificationPermission() !== 'granted') settings.setNotifications(false)
    setPending(undefined)
    toast.success('Backup restaurado ✓')
  }

  return (
    <Section title="Backup">
      <p className="text-sm text-text-2">Seus dados ficam só neste aparelho. Guarde uma cópia de vez em quando.</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="glass"
          size="sm"
          icon={<Download aria-hidden size={16} />}
          onClick={() => {
            downloadBackup()
            toast.success('Backup exportado ✓')
          }}
        >
          Exportar
        </Button>
        <Button
          ref={importRef}
          variant="glass"
          size="sm"
          icon={<Upload aria-hidden size={16} />}
          onClick={() => fileRef.current?.click()}
        >
          Importar
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => void onFile(e)}
          className="hidden"
          aria-label="Escolher arquivo de backup"
          tabIndex={-1}
        />
      </div>

      <AnimatePresence initial={false}>
        {pending && (
          <motion.div
            role="alertdialog"
            aria-labelledby="restore-title"
            aria-describedby="restore-desc"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={springs.smooth}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 rounded-lg border border-[var(--separator)] p-3">
              <p id="restore-title" className="font-semibold">
                Trocar seus dados por este backup?
              </p>
              <p id="restore-desc" className="text-sm text-text-2">
                {backupSummary(pending).text}. O que está no app agora será substituído.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={confirmRestore}>
                  Trocar
                </Button>
                <Button ref={cancelRef} variant="ghost" size="sm" onClick={() => setPending(undefined)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  )
}
