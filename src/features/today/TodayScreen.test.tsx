import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { todayTasks } from '@/domain'
import { useGame, useTasks } from '@/store'
import { toast, UIProvider } from '@/ui'
import { TodayScreen } from './TodayScreen'

configure({ asyncUtilTimeout: 4000 })

vi.mock('@/lib/confetti', () => ({ celebrateReward: vi.fn(), celebrate: vi.fn() }))

const onStartFocus = vi.fn()

function renderToday() {
  return render(
    <UIProvider>
      <TodayScreen onStartFocus={onStartFocus} />
    </UIProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useTasks.setState({ tasks: [] })
  useGame.getState().reset()
  onStartFocus.mockReset()
  act(() => toast.clear())
})

describe('Hoje — ritual Planejar meu dia', () => {
  it('sem tarefas, o convite fica desabilitado', () => {
    renderToday()
    expect(screen.getByRole('button', { name: 'Planejar meu dia' })).toBeDisabled()
  })

  it('escolhe até 3 principais; a 4ª é bloqueada com aviso gentil', async () => {
    const { add } = useTasks.getState()
    for (const title of ['Tarefa 1', 'Tarefa 2', 'Tarefa 3', 'Tarefa 4']) add({ title })
    renderToday()
    fireEvent.click(screen.getByRole('button', { name: 'Planejar meu dia' }))

    const card = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) })
    fireEvent.click(await screen.findByRole('button', { name: /^Tarefa 1/ }))
    fireEvent.click(card('Tarefa 2'))
    fireEvent.click(card('Tarefa 3'))
    expect(screen.getByText(/3\/3 principais/)).toBeInTheDocument()

    fireEvent.click(card('Tarefa 4'))
    expect(card('Tarefa 4')).toHaveAttribute('aria-pressed', 'false')
    // anunciado pelo status sempre montado (o texto visível é aria-hidden)
    expect(screen.getByRole('status')).toHaveTextContent(/Já tem 3 principais/)

    // desmarcar uma principal libera a vaga e limpa o aviso
    fireEvent.click(card('Tarefa 1'))
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('abrir o ritual leva o foco ao título; fechar leva ao botão da vista seguinte', async () => {
    useTasks.getState().add({ title: 'Única' })
    renderToday()
    fireEvent.click(screen.getByRole('button', { name: 'Planejar meu dia' }))
    const title = await screen.findByRole('heading', { name: 'Planejar meu dia' })
    expect(title).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Planejar meu dia' })).toHaveFocus())
  })

  it('replanejar não mostra "+0 XP"', async () => {
    const { add, planToday } = useTasks.getState()
    const a = add({ title: 'Já planejada' })
    planToday([a.id])
    act(() => toast.clear())
    renderToday()
    fireEvent.click(await screen.findByRole('button', { name: 'Replanejar o dia' }))
    fireEvent.click(await screen.findByRole('button', { name: /Fechar o plano/ }))
    expect(await screen.findByText('Plano atualizado ✓')).toBeInTheDocument()
    expect(screen.queryByText(/\+0 XP/)).not.toBeInTheDocument()
  })

  it('Fechar o plano grava principais + pequenas e mostra a lista com progresso', async () => {
    const { add } = useTasks.getState()
    const a = add({ title: 'Relatório' })
    const b = add({ title: 'Lavar louça' })
    add({ title: 'Fora do plano' })
    renderToday()
    fireEvent.click(screen.getByRole('button', { name: 'Planejar meu dia' }))

    fireEvent.click(await screen.findByRole('button', { name: /^Relatório/ }))
    const louca = screen.getByRole('button', { name: /^Lavar louça/ }).closest('li')!
    fireEvent.click(within(louca).getByRole('button', { name: /Pequena/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Fechar o plano (2)' }))

    const today = todayTasks(useTasks.getState().tasks, new Date())
    expect(today.map((t) => t.id)).toEqual([a.id, b.id])
    expect(today[0].isMain).toBe(true)
    expect(today[1].isMain).toBe(false)

    const list = await screen.findByRole('list', { name: 'Tarefas de hoje' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('progressbar', { name: 'Progresso do dia' })).toBeInTheDocument()
  })
})

describe('Hoje — lista planejada', () => {
  function planned(...titles: string[]) {
    const { add } = useTasks.getState()
    const ids = titles.map((title) => add({ title }).id)
    useTasks.getState().planToday(ids.slice(0, 3), ids.slice(3))
    return ids
  }

  it('checkbox conclui com XP e Desfazer', async () => {
    const [a] = planned('Ligar pro banco', 'Responder email')
    renderToday()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Concluir "Ligar pro banco"' }))
    expect(useTasks.getState().tasks.find((t) => t.id === a)?.doneAt).toBeDefined()
    expect(await screen.findByRole('button', { name: 'Desfazer' })).toBeInTheDocument()
  })

  it('concluir pelo checkbox leva o foco ao checkbox vizinho', async () => {
    planned('Primeira', 'Segunda')
    renderToday()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Concluir "Primeira"' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Concluir "Segunda"' })).toHaveFocus())
  })

  it('com tudo feito, só uma celebração e a opção de puxar mais uma', async () => {
    const [a] = planned('Feita')
    useTasks.getState().add({ title: 'Na caixa' })
    useTasks.getState().completeTask(a)
    renderToday()
    expect(await screen.findByText('Dia completo! 🎉')).toBeInTheDocument()
    expect(screen.queryByText(/Tudo do plano feito/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Puxar mais uma?' })).toBeInTheDocument()
  })

  it('↑/↓ na alça reordena, persiste e anuncia a posição', async () => {
    const [a, b] = planned('Primeira', 'Segunda')
    renderToday()
    const handle = await screen.findByRole('button', { name: /Mover "Segunda"/ })
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(todayTasks(useTasks.getState().tasks, new Date()).map((t) => t.id)).toEqual([b, a])
    expect(screen.getByRole('status')).toHaveTextContent('"Segunda" movida para a posição 1 de 2')
  })

  it('▶ abre o foco na tarefa', async () => {
    const [a] = planned('Escrever proposta')
    renderToday()
    fireEvent.click(await screen.findByRole('button', { name: 'Focar em "Escrever proposta"' }))
    expect(onStartFocus).toHaveBeenCalledWith(a)
  })

  it('Replanejar abre as cartas com a seleção atual', async () => {
    planned('Principal')
    renderToday()
    fireEvent.click(await screen.findByRole('button', { name: 'Replanejar o dia' }))
    expect(await screen.findByRole('button', { name: /^Principal/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
