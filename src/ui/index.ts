// Design system do Foco — importe tudo daqui: import { Glass, Button } from '@/ui'

export { UIProvider, type UIProviderProps } from './UIProvider'
export { useMotionReduced, applyReducedMotion, type ReducedMotionMode } from './reducedMotion'
export { AppBackground, type AppBackgroundProps } from './AppBackground'
export { Glass, type GlassProps, type GlassIntensity, type GlassRadius, type GlassTint } from './Glass'
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button'
export { Chip, type ChipProps, type ChipTone } from './Chip'
export { Segmented, type SegmentedProps, type SegmentedOption } from './Segmented'
export { Sheet, type SheetProps } from './Sheet'
export { TabBar, type TabBarProps, type TabItem } from './TabBar'
export { ProgressRing, type ProgressRingProps, type RingTone } from './ProgressRing'
export { Countdown, type CountdownProps } from './Countdown'
export { XPOrb, type XPOrbProps } from './XPOrb'
export { toast, useToast, Toaster, type ToastOptions, type ToastTone } from './Toast'
export { Checkbox, type CheckboxProps } from './Checkbox'
export {
  springs,
  useSpringTransition,
  fade,
  instant,
  fadeUp,
  popIn,
  stagger,
  pressScale,
  type SpringName,
} from './motion'
export { applyTheme, useAppliedTheme } from './theme'
export { useFocusTrap, type FocusTrapOptions } from './useFocusTrap'
