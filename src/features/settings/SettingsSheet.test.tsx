import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { Backup } from '@/lib/backup'
import { useSettings } from '@/store'
import { toast, UIProvider } from '@/ui'
import { SettingsSheet } from './SettingsSheet'

configure({ asyncUtilTimeout: 4000 })

const mocks = vi.hoisted(() => ({
  permission: 'default' as NotificationPermission | 'unsupported',
  enableResult: 'granted' as NotificationPermission | 'unsupported',
  install: { canInstall: false, standalone: false, iosHint: false },
  readResult: undefined as unknown,
  restoreBackup: vi.fn(),
  downloadBackup: vi.fn(),
  sendTestNotification: vi.fn(() => Promise.resolve(true)),
  promptInstall: vi.fn(() => Promise.resolve('accepted')),
}))

vi.mock('@/lib/notifications', () => ({
  notificationPermission: () => mocks.permission,
  enableReminders: async () => {
    const { useSettings } = await import('@/store')
    useSettings.getState().setNotifications(mocks.enableResult === 'granted')
    return mocks.enableResult
  },
  sendTestNotification: mocks.sendTestNotification,
}))
vi.mock('@/lib/pwa', () => ({
  useInstallPrompt: () => ({ ...mocks.install, install: mocks.promptInstall }),
}))
vi.mock('@/lib/sound', () => ({ playChime: vi.fn() }))
vi.mock('@/lib/backup', () => ({
  downloadBackup: mocks.downloadBackup,
  readBackupFile: async () => mocks.readResult,
  restoreBackup: mocks.restoreBackup,
  backupSummary: () => ({ text: '3 tarefas (1 aberta) · nível 2 · salvo em 01/10/2026 às 9h' }),
}))

function renderSettings() {
  return render(
    <UIProvider>
      <SettingsSheet open onClose={() => {}} />
    </UIProvider>,
  )
}

/** O Sheet foca o painel no frame seguinte à abertura; espera isso antes de testar foco. */
async function sheetReady() {
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Ajustes' })).toHaveFocus())
}

beforeEach(() => {
  localStorage.clear()
  useSettings.getState().reset()
  mocks.permission = 'default'
  mocks.enableResult = 'granted'
  mocks.install = { canInstall: false, standalone: false, iosHint: false }
  mocks.restoreBackup.mockReset()
  mocks.downloadBackup.mockReset()
  act(() => toast.clear())
})

describe('Ajustes — lembretes', () => {
  it('explica e ativa; depois mostra Testar/Desligar', async () => {
    renderSettings()
    await sheetReady()
    expect(screen.getByText(/1 dia antes, 1 hora antes/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ativar lembretes' }))

    const test = await screen.findByRole('button', { name: 'Testar' })
    expect(useSettings.getState().notifications).toBe(true)
    expect(mocks.sendTestNotification).toHaveBeenCalled()
    await waitFor(() => expect(test).toHaveFocus())

    fireEvent.click(screen.getByRole('button', { name: 'Desligar' }))
    expect(useSettings.getState().notifications).toBe(false)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ativar lembretes' })).toHaveFocus())
  })

  it('negar a permissão leva o foco ao texto que explica o bloqueio', async () => {
    mocks.enableResult = 'denied'
    renderSettings()
    await sheetReady()
    fireEvent.click(screen.getByRole('button', { name: 'Ativar lembretes' }))
    const blocked = await screen.findByText(/Bloqueados pelo navegador/)
    await waitFor(() => expect(blocked).toHaveFocus())
  })

  it('bloqueado pelo navegador: explica como liberar, sem botão inútil', () => {
    mocks.permission = 'denied'
    renderSettings()
    expect(screen.getByText(/Bloqueados pelo navegador/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ativar lembretes' })).not.toBeInTheDocument()
  })
})

describe('Ajustes — aparência', () => {
  it('tema, som e reduzir animações gravam nos ajustes', () => {
    renderSettings()
    const themes = screen.getByRole('radiogroup', { name: 'Tema' })
    fireEvent.click(within(themes).getByRole('radio', { name: /Escuro/ }))
    expect(useSettings.getState().theme).toBe('dark')
    expect(within(themes).getByRole('radio', { name: /Escuro/ })).toHaveAttribute('aria-checked', 'true')
    expect(within(themes).getByRole('radio', { name: /Claro/ })).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Som ao concluir' }))
    expect(useSettings.getState().sound).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Reduzir animações' }))
    expect(useSettings.getState().reduceMotion).toBe(true)
  })
})

describe('Ajustes — instalar', () => {
  it('some quando não dá pra instalar', () => {
    renderSettings()
    expect(screen.queryByRole('heading', { name: 'Instalar' })).not.toBeInTheDocument()
  })

  it('mostra o botão quando o navegador oferece', async () => {
    mocks.install = { canInstall: true, standalone: false, iosHint: false }
    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Instalar o Foco' }))
    expect(await screen.findByText('Foco instalado 🎉')).toBeInTheDocument()
  })

  it('no iPhone, explica o caminho manual', () => {
    mocks.install = { canInstall: false, standalone: false, iosHint: true }
    renderSettings()
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument()
  })
})

describe('Ajustes — backup', () => {
  it('exportar baixa o arquivo', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(mocks.downloadBackup).toHaveBeenCalled()
    expect(screen.getByText('Backup exportado ✓')).toBeInTheDocument()
  })

  it('importar pede confirmação com resumo; Cancelar não troca nada', async () => {
    mocks.readResult = { ok: true, backup: {} as Backup }
    const { container } = renderSettings()
    await sheetReady()
    const input = container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]')!
    fireEvent.change(input, { target: { files: [new File(['{}'], 'foco.json', { type: 'application/json' })] } })

    const dialog = await screen.findByRole('alertdialog', { name: 'Trocar seus dados por este backup?' })
    expect(dialog).toHaveTextContent('3 tarefas (1 aberta)')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus())

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(mocks.restoreBackup).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Importar' })).toHaveFocus())
  })

  it('confirmar troca os dados', async () => {
    mocks.readResult = { ok: true, backup: {} as Backup }
    const { container } = renderSettings()
    const input = container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]')!
    fireEvent.change(input, { target: { files: [new File(['{}'], 'foco.json')] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Trocar' }))
    expect(mocks.restoreBackup).toHaveBeenCalled()
    expect(await screen.findByText('Backup restaurado ✓')).toBeInTheDocument()
  })

  it('backup de outro aparelho com lembretes ligados não liga lembretes sem permissão aqui', async () => {
    mocks.readResult = { ok: true, backup: {} as Backup }
    mocks.restoreBackup.mockImplementation(() => useSettings.getState().setNotifications(true))
    const { container } = renderSettings()
    const input = container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]')!
    fireEvent.change(input, { target: { files: [new File(['{}'], 'foco.json')] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Trocar' }))
    expect(useSettings.getState().notifications).toBe(false)
  })

  it('arquivo inválido avisa com o motivo', async () => {
    mocks.readResult = { ok: false, error: 'Não é um backup do Foco.' }
    const { container } = renderSettings()
    const input = container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]')!
    fireEvent.change(input, { target: { files: [new File(['x'], 'x.json')] } })
    expect(await screen.findByText('Não é um backup do Foco.')).toBeInTheDocument()
  })
})
