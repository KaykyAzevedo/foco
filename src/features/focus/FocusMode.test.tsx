import { act, fireEvent, render, screen } from '@testing-library/react'
import { useGame, useSettings, useTasks } from '@/store'
import { Toaster, toast } from '@/ui'
import { FocusMode } from './FocusMode'

vi.mock('@/lib/confetti', () => ({ celebrateReward: vi.fn(), celebrate: vi.fn() }))

beforeEach(() => {
  localStorage.clear()
  useTasks.setState({ tasks: [] })
  useGame.getState().reset()
  useSettings.setState({ focusMinutes: 25, sound: false })
  act(() => toast.clear())
})

afterEach(() => {
  vi.useRealTimers()
})

function setup() {
  const task = useTasks.getState().add({ title: 'Relatório de vendas', steps: ['Abrir planilha', 'Filtrar setembro'] })
  const onClose = vi.fn()
  render(
    <>
      <FocusMode taskId={task.id} onClose={onClose} />
      <Toaster />
    </>,
  )
  return { task, onClose }
}

describe('Modo Foco', () => {
  it('abre em tela cheia com a tarefa, 25 min e os micro-passos', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Modo foco: Relatório de vendas' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Timer de foco' })).toHaveAttribute('aria-valuetext', '25 minutos restantes')
    expect(screen.getByRole('button', { name: '25 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('checkbox', { name: 'Abrir planilha' })).toBeInTheDocument()
  })

  it('troca a duração e lembra a escolha', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: '10 min' }))
    expect(useSettings.getState().focusMinutes).toBe(10)
    expect(screen.getByRole('progressbar', { name: 'Timer de foco' })).toHaveAttribute('aria-valuetext', '10 minutos restantes')
  })

  it('ao fim do timer dá XP de foco e oferece Concluiu / +5 min / Pausa', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setup()
    fireEvent.click(screen.getByRole('button', { name: '10 min' }))
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    expect(await screen.findByRole('button', { name: 'Pausar' }, { timeout: 8000 })).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(10 * 60_000 + 500)
    })
    expect(useGame.getState().stats.focusSessions).toBe(1)
    expect(await screen.findByRole('button', { name: 'Concluí a tarefa' }, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pausa' })).toBeInTheDocument()
  }, 20_000)

  it('marcar micro-passo dá XP', () => {
    setup()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Abrir planilha' }))
    expect(useGame.getState().stats.stepsCompleted).toBe(1)
    expect(useGame.getState().xp).toBeGreaterThan(0)
  })

  it('adiciona micro-passo pelo campo', () => {
    const { task } = setup()
    const input = screen.getByRole('textbox', { name: 'Adicionar micro-passo' })
    fireEvent.change(input, { target: { value: 'Mandar pra chefe' } })
    fireEvent.submit(input)
    expect(useTasks.getState().tasks.find((t) => t.id === task.id)?.steps).toHaveLength(3)
  })

  it('concluir a tarefa marca como feita e fecha', () => {
    const { task, onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Já terminei a tarefa' }))
    expect(useTasks.getState().tasks.find((t) => t.id === task.id)?.doneAt).toBeTruthy()
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc sai do foco', () => {
    const { onClose } = setup()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc com o timer rodando só pausa; o 2º Esc sai', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    expect(screen.getByText('Sessão de foco em andamento.')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Sessão pausada. Esc de novo para sair do foco.')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
