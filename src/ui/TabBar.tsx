import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Glass } from './Glass'
import { springs } from './motion'

export interface TabItem<T extends string = string> {
  id: T
  label: string
  icon: ReactNode
  /** Número pequeno no canto (ex.: atrasadas). 0/undefined esconde. */
  badge?: number
}

export interface TabBarProps<T extends string = string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  /** Fixa a barra flutuando no rodapé (com safe-area). Padrão: true. */
  floating?: boolean
  'aria-label'?: string
  className?: string
}

/** Barra de abas de vidro flutuante com indicador que desliza (layoutId) entre as abas. */
export function TabBar<T extends string>({
  items,
  value,
  onChange,
  floating = true,
  'aria-label': ariaLabel = 'Navegação principal',
  className,
}: TabBarProps<T>) {
  const layoutId = `ui-tab-ind-${useId()}`
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = -1
    if (e.key === 'ArrowRight') next = (index + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next < 0) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(items[next].id)
  }

  return (
    <div className="ui-tabbar-wrap" data-floating={floating}>
      <Glass
        intensity="regular"
        radius="full"
        className={clsx('ui-tabbar', className)}
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item, i) => {
          const selected = item.id === value
          return (
            <motion.button
              key={item.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              className="ui-tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              whileTap={{ scale: 0.92 }}
              transition={springs.snappy}
            >
              {selected && (
                <motion.span
                  layoutId={layoutId}
                  className="ui-tab-indicator"
                  transition={springs.bouncy}
                  aria-hidden
                />
              )}
              <motion.span
                aria-hidden
                animate={{ scale: selected ? 1.08 : 1, y: selected ? -1 : 0 }}
                transition={springs.bouncy}
                style={{ display: 'grid' }}
              >
                {item.icon}
              </motion.span>
              <span>{item.label}</span>
              {item.badge ? (
                <span className="ui-tab-badge" aria-label={`${item.badge} pendentes`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </motion.button>
          )
        })}
      </Glass>
    </div>
  )
}
