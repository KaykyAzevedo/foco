import { act, fireEvent, render, screen } from '@testing-library/react'
import { XPOrb } from './XPOrb'
import { Segmented } from './Segmented'
import { Button, Checkbox, Chip, Countdown, ProgressRing, Sheet, TabBar, Toaster, toast } from './index'

const NOW = new Date('2026-10-02T12:00:00')
const at = (ms: number) => new Date(NOW.getTime() + ms)
const MIN = 60_000
const H = 60 * MIN

describe('Countdown', () => {
  it('usa a urgência informada pelo domínio quando passada', () => {
    const { container } = render(<Countdown due={at(30 * H).toISOString()} urgency="urgent" now={NOW} />)
    expect(container.querySelector('.ui-countdown')).toHaveAttribute('data-urgency', 'urgent')
    expect(screen.getByText('em 1 dia')).toBeInTheDocument()
    expect(container.querySelector('time')).toHaveAttribute('dateTime', at(30 * H).toISOString())
  })
})

describe('Button', () => {
  it('carregando: ignora clique, fica ocupado e mantém o foco', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Salvar' })
    // continua focável (sem disabled nativo), mas inativo para tecnologia assistiva e cliques
    expect(btn).not.toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    expect(btn).toHaveAttribute('aria-busy', 'true')
    btn.focus()
    expect(btn).toHaveFocus()
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
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

describe('XPOrb', () => {
  it('anuncia ganho de XP por padrão e silencia com announce={false}', () => {
    const { container, rerender } = render(<XPOrb level={1} xp={10} />)
    rerender(<XPOrb level={1} xp={40} />)
    expect(container.querySelector('[aria-live]')).toHaveTextContent('+30 XP')

    const quiet = render(<XPOrb level={1} xp={10} announce={false} />)
    quiet.rerender(<XPOrb level={1} xp={40} announce={false} />)
    expect(quiet.container.querySelector('[aria-live]')).toBeNull()
    expect(quiet.container.querySelector('.ui-xporb-gain')).toHaveTextContent('+30 XP')
  })
})

describe('UIProvider reducedMotion', () => {
  it('"always" liga <html data-reduce-motion> e reduz o movimento efetivo', async () => {
    const { UIProvider, useMotionReduced } = await import('./index')
    let seen: boolean | undefined
    function Probe() {
      seen = useMotionReduced()
      return null
    }
    const { rerender } = render(
      <UIProvider reducedMotion="always">
        <Probe />
      </UIProvider>,
    )
    expect(document.documentElement.hasAttribute('data-reduce-motion')).toBe(true)
    expect(seen).toBe(true)
    rerender(
      <UIProvider reducedMotion="user">
        <Probe />
      </UIProvider>,
    )
    expect(document.documentElement.hasAttribute('data-reduce-motion')).toBe(false)
    expect(seen).toBe(false)
  })
})

describe('Segmented', () => {
  const options = [
    { id: 'system', label: 'Automático' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
  ] as const
  it('é um radiogroup com roving tabindex e setas', () => {
    const onChange = vi.fn()
    render(<Segmented aria-label="Tema" options={[...options]} value="light" onChange={onChange} />)
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument()
    const claro = screen.getByRole('radio', { name: 'Claro' })
    expect(claro).toHaveAttribute('aria-checked', 'true')
    expect(claro).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Escuro' })).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(claro, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('dark')
    expect(screen.getByRole('radio', { name: 'Escuro' })).toHaveFocus()
    fireEvent.keyDown(claro, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('system')
    fireEvent.click(screen.getByRole('radio', { name: 'Escuro' }))
    expect(onChange).toHaveBeenLastCalledWith('dark')
  })
})
