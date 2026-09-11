// Approval tone (free-trace-mode "Approval Feedback", T5.3): a short, soft
// Web Audio sine (C5) with an exponential gain envelope. Runs ONLY on an
// approved trace — non-approved strokes must NOT play it. Headless browsers
// have no audio device, so the AudioContext is created lazily on the first
// approval (inside the release gesture) and is best-effort: any failure is
// swallowed, never breaking the trace loop. Tests inject a fake AudioContext
// through the optional `ctx` parameter.
//
// The context itself now lives in `canvas/audio.ts` and is SHARED with the live
// corridor tone and the metronome (`canvas/traceTone.ts`) — browsers cap how
// many contexts one page may open, and three feedback channels must not each
// claim one.
import { resumeAudio, sharedAudioContext } from '../canvas/audio'

/** Play the soft approval tone; no-op outside a browser or on audio failure. */
export function playApprovalTone(ctx?: AudioContext | null): void {
  const audio = ctx ?? sharedAudioContext()
  if (!audio) return
  try {
    resumeAudio(audio) // autoplay policy
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    const t = audio.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, t) // C5 — soft, scalar
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(t)
    osc.stop(t + 0.62)
  } catch {
    // best-effort: audio must never break the evaluation/feedback loop
  }
}
