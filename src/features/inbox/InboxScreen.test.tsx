import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { dayKey } from '@/domain'
import { useTasks } from '@/store'
import { toast, UIProvider } from '@/ui'
import { InboxScreen } from './InboxScreen'

configure({ asyncUtilTimeout: 4000 })

function renderInbox() {
  return render(
    <UIProvider>
      <InboxScreen />
    </UIProvider>,
  )
}

const HOUR = 3_600_000
const task = (title: string) => useTasks.getState().tasks.find((t) => t.title === title)!

beforeEach(() => {
  localStorage.clear()
  useTasks.setState({ tasks: [] })
  act(() => toast.clear())
})

describe('Caixa', () => {
  it('estado vazio quando tudo foi triado', () => {
    renderInbox()
    expect(screen.getByRole('heading', { name: 'Caixa vazia' })).toBeInTheDocument()
  })

  it('agrupa em Atrasadas · Esta semana · Depois · Sem data', () => {
    const { add } = useTasks.getState()
    const now = Date.now()
    add({ title: 'Atrasada', due: new Date(now - 2 * HOUR).toISOString() })
    add({ title: 'Na semana', due: new Date(now + 2 * 24 * HOUR).toISOString() })
    add({ title: 'Mais tarde', due: new Date(now + 30 * 24 * HOUR).toISOString() })
    add({ title: 'Sem prazo' })
    renderInbox()

    const group = (name: RegExp) => screen.getByRole('region', { name })
    expect(within(group(/^Atrasadas/)).getByText('Atrasada')).toBeInTheDocument()
    expect(within(group(/^Esta semana/)).getByText('Na semana')).toBeInTheDocument()
    expect(within(group(/^Depois/)).getByText('Mais tarde')).toBeInTheDocument()
    expect(within(group(/^Sem data/)).getByText('Sem prazo')).toBeInTheDocument()
  })

  it('Reagendar (1 toque) joga a atrasada pra amanhã, com Desfazer', async () => {
    const old = new Date(Date.now() - 2 * HOUR).toISOString()
    useTasks.getState().add({ title: 'Pagar conta', due: old })
    renderInbox()

    fireEvent.click(screen.getByRole('button', { name: 'Reagendar "Pagar conta" para amanhã' }))
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(dayKey(task('Pagar conta').due!)).toBe(dayKey(tomorrow))

    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }))
    expect(task('Pagar conta').due).toBe(old)
  })

  it('triagem: chip de prazo, da chefe, passos e Mandar pra Hoje', async () => {
    useTasks.getState().add({ title: 'Proposta' })
    renderInbox()
    fireEvent.click(screen.getByRole('button', { name: /Proposta/, expanded: false }))

    fireEvent.click(await screen.findByRole('button', { name: 'Amanhã' }))
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(dayKey(task('Proposta').due!)).toBe(dayKey(tomorrow))
    expect(await screen.findByRole('button', { name: 'Amanhã', pressed: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Da chefe/ }))
    expect(task('Proposta').fromBoss).toBe(true)

    const stepInput = screen.getByRole('textbox', { name: 'Adicionar passo a "Proposta"' })
    fireEvent.change(stepInput, { target: { value: 'Abrir o modelo' } })
    fireEvent.submit(stepInput.closest('form')!)
    expect(task('Proposta').steps.map((s) => s.title)).toEqual(['Abrir o modelo'])
    expect(stepInput).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: /Mandar pra Hoje/ }))
    expect(task('Proposta').plannedFor).toBe(dayKey(new Date()))
    expect(await screen.findByText('Foi pra Hoje ☀️')).toBeInTheDocument()
  })

  it('apagar tem Desfazer', async () => {
    useTasks.getState().add({ title: 'Lixo' })
    renderInbox()
    fireEvent.click(screen.getByRole('button', { name: /Lixo/, expanded: false }))
    fireEvent.click(await screen.findByRole('button', { name: 'Apagar "Lixo"' }))
    expect(useTasks.getState().tasks).toHaveLength(0)
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }))
    expect(task('Lixo')).toBeDefined()
  })

  it('trocar o prazo move o item de grupo e o foco segue no chip escolhido', async () => {
    useTasks.getState().add({ title: 'Sem data ainda' })
    renderInbox()
    fireEvent.click(screen.getByRole('button', { name: /Sem data ainda/, expanded: false }))
    fireEvent.click(await screen.findByRole('button', { name: 'Amanhã' }))

    const week = await screen.findByRole('region', { name: /^Esta semana/ })
    expect(within(week).getByText('Sem data ainda')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Amanhã', pressed: true })).toHaveFocus())
  })

  it('Mandar pra Hoje leva o foco ao item vizinho', async () => {
    const { add } = useTasks.getState()
    add({ title: 'Primeiro' })
    add({ title: 'Segundo' })
    renderInbox()
    fireEvent.click(screen.getByRole('button', { name: /Primeiro/, expanded: false }))
    fireEvent.click(await screen.findByRole('button', { name: /Mandar pra Hoje/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Segundo/, expanded: false })).toHaveFocus())
  })

  it('o chip de prazo de hoje diz "Vence hoje" (não confunde com Mandar pra Hoje)', async () => {
    useTasks.getState().add({ title: 'Qualquer' })
    renderInbox()
    fireEvent.click(screen.getByRole('button', { name: /Qualquer/, expanded: false }))
    expect(await screen.findByRole('button', { name: 'Vence hoje' })).toBeInTheDocument()
  })
})
