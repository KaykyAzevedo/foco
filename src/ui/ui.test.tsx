import { act, fireEvent, render, screen } from '@testing-library/react'
import { Button, Checkbox, Chip, Countdown, ProgressRing, Sheet, TabBar, Toaster, formatCountdown, toast, urgencyFromDue } from './index'

const NOW = new Date('2026-10-02T12:00:00')
const at = (ms: number) => new Date(NOW.getTime() + ms)
const MIN = 60_000
const H = 60 * MIN

describe('formatCountdown / urgencyFromDue', () => {
  it('formata prazos futuros e passados em PT-BR sem culpa', () => {
    expect(formatCountdown(at(20 * MIN), NOW)).toBe('em 20 min')
    expect(formatCountdown(at(2 * H + 15 * MIN), NOW)).toBe('em 2h 15min')
    expect(formatCountdown(at(3 * H), NOW)).toBe('em 3h')
    expect(formatCountdown(at(3 * 24 * H), NOW)).toBe('em 3 dias')
    expect(formatCountdown(at(-25 * MIN), NOW)).toBe('passou há 25 min')
    expect(formatCountdown(at(-26 * H), NOW)).toBe('passou há 1 dia')
    expect(formatCountdown(at(20_000), NOW)).toBe('vence agora')
  })

  it('classifica urgência', () => {
    expect(urgencyFromDue(at(-1), NOW)).toBe('overdue')
    expect(urgencyFromDue(at(90 * MIN), NOW)).toBe('urgent')
    expect(urgencyFromDue(at(5 * H), NOW)).toBe('soon')
    expect(urgencyFromDue(at(30 * H), NOW)).toBe('calm')
  })
})

describe('Countdown', () => {
  it('usa a urgência informada pelo domínio quando passada', () => {
    const { container } = render(<Countdown due={at(30 * H).toISOString()} urgency="urgent" now={NOW} />)
    expect(container.querySelector('.ui-countdown')).toHaveAttribute('data-urgency', 'urgent')
    expect(screen.getByText('em 1 dia')).toBeInTheDocument()
  })
})

describe('Button', () => {
  it('fica desativado e ocupado ao carregar', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Salvar' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Chip', () => {
  it('vira toggle com aria-pressed', () => {
    const onClick = vi.fn()
    render(
      <Chip selected onClick={onClick}>
        Hoje
      </Chip>,
    )
    const chip = screen.getByRole('button', { name: 'Hoje' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(chip)
    expect(onClick).toHaveBeenCalled()
  })
})

describe('Checkbox', () => {
  it('alterna pelo botão e pelo rótulo', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} label="Abrir planilha" />)
    const box = screen.getByRole('checkbox', { name: 'Abrir planilha' })
    expect(box).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(box)
    fireEvent.click(screen.getByText('Abrir planilha'))
    expect(onChange).toHaveBeenNthCalledWith(1, true)
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})

describe('ProgressRing', () => {
  it('expõe progresso acessível e limita a 0..1', () => {
    render(<ProgressRing progress={1.7} label="Dia" />)
    expect(screen.getByRole('progressbar', { name: 'Dia' })).toHaveAttribute('aria-valuenow', '100')
  })
})

describe('TabBar', () => {
  it('marca a aba ativa e navega por setas', () => {
    const onChange = vi.fn()
    render(
      <TabBar
        value="agora"
        onChange={onChange}
        items={[
          { id: 'agora', label: 'Agora', icon: null },
          { id: 'hoje', label: 'Hoje', icon: null },
        ]}
      />,
    )
    const agora = screen.getByRole('tab', { name: 'Agora' })
    expect(agora).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(agora, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('hoje')
  })
})

describe('Sheet', () => {
  it('é um diálogo modal que fecha com Esc', () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose} title="Detalhes">
        conteúdo
      </Sheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Detalhes' })).toHaveAttribute('aria-modal', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('toast', () => {
  it('mostra mensagem imperativa', () => {
    render(<Toaster />)
    act(() => {
      toast('Capturado ✓')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Capturado ✓')
    act(() => toast.clear())
  })
})
