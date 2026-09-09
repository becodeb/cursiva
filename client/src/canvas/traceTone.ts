// Live audio channels for a level in progress.
//
// docs/01 principle 1 bans "música mientras el chico traza" and docs/04 caps
// sound at "un tono suave de aprobación". Neither of these is background music:
// both are CONTINGENT signals that exist only while the finger is on the glass
// and that carry information the child is acting on, which is the distinction
// docs/02 §7.2 now records. They are also per-level data (`LevelFeedback`), off
// wherever the catalogue leaves them off.
//
//  - `createTraceTone` — the "linterna encendida" of docs/01 principle 2. A
//    soft low tone sounds while the finger is INSIDE the corridor and fades out
//    when it leaves. The child hears that they are doing it right, and hears it
//    stop; nothing ever announces an error.
//  - `playBeatTick`   — the phase-2 rhythm cue (docs/01 fase 2: "planificación
//    motora, ritmo"). A pulse to pace the pattern against, not a metronome to
//    obey.
//
// Both are best-effort: no Web Audio, no sound, no thrown error, level plays.
import { resumeAudio, sharedAudioContext } from './audio'

/** G3. Low enough to sit under a classroom without cutting through it, and far
 * from the C5 approval tone so the two are never confused. */
const TONE_HZ = 196
/** Sustain level. The approval tone peaks at 0.15; the corridor tone is
 * deliberately a third of that, because it is on for the whole stroke. */
const TONE_GAIN = 0.05
/** Gain ramp. A stepped gain CLICKS — the discontinuity is broadband noise, and
 * at 10 Hz sampling the child would hear a rattle every time they grazed the
 * corridor edge. 60 ms is inaudible as a ramp and inaudible as a click. */
const TONE_RAMP_S = 0.06
/** Exponential ramps cannot reach or cross zero, so silence is this epsilon. */
const SILENCE = 0.0001

/** A sustained tone whose only control is "is the finger inside the corridor". */
export interface TraceTone {
  /** Fade in when inside, fade out when outside. Idempotent per state. */
  setActive: (active: boolean) => void
  /** Stop and disconnect. MUST be called on unmount or the oscillator outlives
   * the screen and the next level plays over a ghost tone. */
  dispose: () => void
}

/**
 * A corridor tone. Nothing touches the audio device until the first
 * `setActive(true)`, which only ever happens inside a stroke — that is the user
 * gesture the autoplay policy demands, so no context is ever created and left
 * suspended by merely opening a level.
 *
 * `ctx` is for tests: pass a fake to observe the nodes, or `null` to assert the
 * no-audio path.
 */
export function createTraceTone(ctx?: AudioContext | null): TraceTone {
  // `undefined` means "not resolved yet"; an explicit `null` means "no audio",
  // and must NOT fall through to the shared context.
  let resolved: AudioContext | null | undefined = ctx
  let osc: OscillatorNode | null = null
  let gain: GainNode | null = null
  let active = false
  let disposed = false

  const audio = (): AudioContext | null => {
    if (resolved === undefined) resolved = sharedAudioContext()
    return resolved
  }

  const start = (): boolean => {
    if (osc && gain) return true
    const a = audio()
    if (!a) return false
    try {
      const o = a.createOscillator()
      const g = a.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(TONE_HZ, a.currentTime)
      g.gain.setValueAtTime(SILENCE, a.currentTime)
      o.connect(g)
      g.connect(a.destination)
      o.start()
      osc = o
      gain = g
      return true
    } catch {
      return false // best-effort: a level must play on a device without audio
    }
  }

  return {
    setActive(next: boolean): void {
      if (disposed || next === active) return
      active = next
      // Turning OFF before anything ever started is not worth an AudioContext.
      if (!next && !osc) return
      if (!start()) return
      const a = audio()
      if (!a || !gain) return
      try {
        if (next) resumeAudio(a)
        const t = a.currentTime
        gain.gain.cancelScheduledValues(t)
        gain.gain.setValueAtTime(Math.max(gain.gain.value, SILENCE), t)
        gain.gain.exponentialRampToValueAtTime(next ? TONE_GAIN : SILENCE, t + TONE_RAMP_S)
      } catch {
        // best-effort
      }
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      active = false
      try {
        osc?.stop()
        osc?.disconnect()
        gain?.disconnect()
      } catch {
        // best-effort
      }
      osc = null
      gain = null
    },
  }
}

/** Beat click: high, very short, very quiet. */
const TICK_HZ = 880
const TICK_GAIN = 0.06
const TICK_S = 0.05

/**
 * One metronome beat (docs/01 fase 2, "ritmo"). Short enough that it never
 * overlaps the next beat at any BPM a child can trace to, and quiet enough that
 * a muted classroom tablet loses nothing the visual pulse does not also carry.
 */
export function playBeatTick(ctx?: AudioContext | null): void {
  const audio = ctx === undefined ? sharedAudioContext() : ctx
  if (!audio) return
  try {
    resumeAudio(audio)
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    const t = audio.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(TICK_HZ, t)
    gain.gain.setValueAtTime(SILENCE, t)
    gain.gain.exponentialRampToValueAtTime(TICK_GAIN, t + 0.005)
    gain.gain.exponentialRampToValueAtTime(SILENCE, t + TICK_S)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(t)
    osc.stop(t + TICK_S + 0.01)
  } catch {
    // best-effort: the visual beat pulse carries the same cue
  }
}
