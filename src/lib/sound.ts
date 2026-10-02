// Som opcional de conclusão (WebAudio, sem arquivos). Quem chama decide se o som está ligado.
let ctx: AudioContext | undefined

export function playChime(kind: 'done' | 'level' = 'done'): void {
  try {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    const audio = ctx
    const notes = kind === 'level' ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 987.77]
    notes.forEach((freq, i) => {
      const t = audio.currentTime + i * 0.09
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch {
    /* áudio indisponível */
  }
}
