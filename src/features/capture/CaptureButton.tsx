// Botão flutuante de captura (acima da TabBar).
import { Plus } from 'lucide-react'
import { Button } from '@/ui'

export function CaptureButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="glass"
      size="lg"
      iconOnly
      aria-label="Capturar tarefa (atalho N)"
      title="Capturar (N ou Ctrl+K)"
      icon={<Plus aria-hidden size={26} />}
      onClick={onClick}
      className="fixed right-5 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 shadow-glass"
    />
  )
}
