import { useEffect, useState } from 'react'

/** "Agora" que atualiza sozinho (padrão: a cada 30 s). Use para contagens regressivas e seletores. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
