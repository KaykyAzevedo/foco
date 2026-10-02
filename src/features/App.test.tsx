import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { dayKey } from '@/domain'
import { useGame, useSettings, useTasks } from '@/store'
import { toast } from '@/ui'
import App from '../App'
import { greeting } from './now/useMorningSummaryToast'

// jsdom não tem canvas
vi.mock('@/lib/confetti', () => ({ celebrateReward: vi.fn(), celebrate: vi.fn() }))

beforeEach(() => {
  localStorage.clear()
  useTasks.setState({ tasks: [] })
  useGame.getState().reset()
  // resumo da manhã já mostrado hoje → não polui os testes
  useSettings.setState({ lastMorningSummary: dayKey(new Date()) })
  act(() => toast.clear())
})

describe('Shell', () => {
  it('abre em Agora e navega entre as 3 abas', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Agora' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Hoje/ }))
    expect(await screen.findByRole('heading', { name: 'Hoje' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Caixa/ }))
    expect(await screen.findByRole('heading', { name: 'Caixa' })).toBeInTheDocument()
  })

  it('mostra o resumo da manhã só uma vez por dia', async () => {
    useSettings.setState({ lastMorningSummary: undefined })
    render(<App />)
    expect(await screen.findByText(greeting(new Date()))).toBeInTheDocument()
    expect(useSettings.getState().lastMorningSummary).toBe(dayKey(new Date()))
  })
})

describe('Agora', () => {
  it('estado vazio celebrativo quando não há nada', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Tudo limpo' })).toBeInTheDocument()
  })

  it('mostra só a próxima tarefa, com selo da chefe e primeiro passo', () => {
    const { add } = useTasks.getState()
    add({ title: 'Regar plantas' })
    add({ title: 'Enviar relatório', fromBoss: true, steps: ['Abrir planilha', 'Exportar PDF'] })
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Enviar relatório' })).toBeInTheDocument()
    expect(screen.queryByText('Regar plantas')).not.toBeInTheDocument()
    expect(screen.getByText('Pedido da chefe')).toBeInTheDocument()
    expect(screen.getByText('Abrir planilha')).toBeInTheDocument()
  })

  it('Feito conclui, dá XP e mostra Desfazer', async () => {
    const task = useTasks.getState().add({ title: 'Pagar boleto' })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Feito' }))

    expect(useTasks.getState().tasks.find((t) => t.id === task.id)?.doneAt).toBeDefined()
    expect(useGame.getState().xp).toBeGreaterThan(0)
    const undo = await screen.findByRole('button', { name: 'Desfazer' })
    fireEvent.click(undo)
    expect(useTasks.getState().tasks.find((t) => t.id === task.id)?.doneAt).toBeUndefined()
  })

  it('Pular por agora mostra a próxima tarefa, sem punição', async () => {
    const { add } = useTasks.getState()
    add({ title: 'Primeira', urgent: true })
    add({ title: 'Segunda' })
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Primeira' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pular por agora' }))
    expect(await screen.findByRole('heading', { name: 'Segunda' })).toBeInTheDocument()
    expect(useGame.getState().xp).toBe(0)
  })

  it('após Feito, o foco do teclado vai pro Começar do próximo card', async () => {
    const { add } = useTasks.getState()
    add({ title: 'Primeira', urgent: true })
    add({ title: 'Segunda' })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Feito' }))
    await screen.findByRole('heading', { name: 'Segunda' })
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Começar'))
  })

  it('um único toast traz XP, marcos e Desfazer', async () => {
    useTasks.getState().add({ title: 'Relatório', fromBoss: true, urgent: true })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Feito' }))
    expect(await screen.findByText(/Feito! \+\d+ XP/)).toBeInTheDocument()
    expect(screen.getAllByText(/Feito!/)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument()
    expect(screen.queryByText(/^Missão cumprida:/)).not.toBeInTheDocument()
  })

  it('Pular a única tarefa avisa que é a única, sem trocar o card', async () => {
    useTasks.getState().add({ title: 'Sozinha' })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Pular por agora' }))
    expect(await screen.findByText(/É a única por agora/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sozinha' })).toBeInTheDocument()
  })

  it('Começar abre o modo foco com a tarefa', async () => {
    useTasks.getState().add({ title: 'Escrever proposta' })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    expect(await screen.findByRole('dialog', { name: 'Modo foco' })).toBeInTheDocument()
  })
})

describe('Captura rápida', () => {
  it('abre com N e com Ctrl+K; digitar N no campo não reabre', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'n' })
    const input = await screen.findByRole('textbox', { name: 'Nova tarefa' })
    fireEvent.keyDown(input, { key: 'n' })
    expect(screen.getByRole('dialog', { name: 'Captura rápida' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Captura rápida' })).not.toBeInTheDocument())

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog', { name: 'Captura rápida' })).toBeInTheDocument()
  })

  it('mostra chips detectados e Enter salva e fecha', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Capturar tarefa/ }))
    const input = await screen.findByRole('textbox', { name: 'Nova tarefa' })

    fireEvent.change(input, { target: { value: 'ligar fornecedor sexta #chefe !' } })
    expect(screen.getByText('Da chefe')).toBeInTheDocument()
    expect(screen.getByText('Urgente')).toBeInTheDocument()

    fireEvent.submit(input.closest('form')!)
    const [task] = useTasks.getState().tasks
    expect(task).toMatchObject({ title: 'ligar fornecedor', fromBoss: true, urgent: true })
    expect(task.due).toBeDefined()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Captura rápida' })).not.toBeInTheDocument())
  })

  it('Shift+Enter salva e mantém aberto para a próxima', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'n' })
    const input = await screen.findByRole('textbox', { name: 'Nova tarefa' })
    fireEvent.change(input, { target: { value: 'comprar café' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

    expect(useTasks.getState().tasks).toHaveLength(1)
    expect(input).toHaveValue('')
    expect(screen.getByRole('dialog', { name: 'Captura rápida' })).toBeInTheDocument()
  })
})
