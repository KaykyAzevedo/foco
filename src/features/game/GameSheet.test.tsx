import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useGame, useTasks } from '@/store'
import { toast } from '@/ui'
import { GameSheet } from './GameSheet'

vi.mock('@/lib/confetti', () => ({ celebrateReward: vi.fn(), celebrate: vi.fn() }))

beforeEach(() => {
  localStorage.clear()
  useTasks.setState({ tasks: [] })
  useGame.getState().reset()
  act(() => toast.clear())
})

describe('Folha de gamificação', () => {
  it('mostra nível, ritmo, missão e conquistas', () => {
    render(<GameSheet open onClose={() => {}} />)
    const sheet = screen.getByRole('dialog', { name: 'Seu progresso' })
    expect(within(sheet).getByRole('heading', { name: 'Nível 1' })).toBeInTheDocument()
    expect(within(sheet).getByText('Sequência')).toBeInTheDocument()
    expect(within(sheet).getByText('Escudo')).toBeInTheDocument()
    expect(within(sheet).getByText('Combo')).toBeInTheDocument()
    expect(within(sheet).getByRole('progressbar', { name: 'Progresso da missão' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /Primeira tarefa: bloqueada/ })).toBeInTheDocument()
  })

  it('conquista desbloqueada aparece primeiro e abre o detalhe', () => {
    const t = useTasks.getState().add({ title: 'Qualquer coisa' })
    act(() => {
      useTasks.getState().complete(t.id)
    })
    render(<GameSheet open onClose={() => {}} />)
    const badge = screen.getByRole('button', { name: /Primeira tarefa: desbloqueada/ })
    const all = screen.getAllByRole('button', { name: /Ver detalhes/ })
    expect(all[0]).toBe(badge)
    fireEvent.click(badge)
    const detail = screen.getByRole('dialog', { name: 'Primeira tarefa' })
    expect(within(detail).getByText(/Desbloqueada em/)).toBeInTheDocument()
    fireEvent.click(within(detail).getByRole('button', { name: 'Fechar' }))
  })

  it('Esc fecha só o detalhe da conquista; o 2º Esc fecha a folha', () => {
    const onClose = vi.fn()
    render(<GameSheet open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Primeira tarefa: bloqueada/ }))
    expect(screen.getByRole('dialog', { name: 'Primeira tarefa' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
