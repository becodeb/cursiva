// Synthesized sound effects — WebAudio oscillators only, never an audio file
// (T35, `odd/tasks/prewriting-stage-completion.md`). `docs/01` principle 2
// bans any FAILURE sound ("no punishment, no red"): every entry in
// `SFX_PALETTE` is a small reward or a neutral confirmation, never a buzzer,
// and `wrong` — the one outcome that could tempt one — is a soft, level
// (never descending) hum on purpose; see its own comment below.
//
// One shared `AudioContext` (`canvas/audio.ts`'s `sharedAudioContext`, the
// SAME instance `canvas/traceTone.ts`/`modes/tone.ts` already use — browsers
// cap how many contexts one page may open, so a fourth feedback channel must
// not claim its own), resumed on every play the same best-effort way every
// other channel in this app already does (autoplay policy: a context created
// before the first gesture starts `suspended`).
//
// Every function here is best-effort: a missing Web Audio device, a throwing
// node, a hidden tab, or the narrator's own mute all read as "play nothing",
// never as a thrown error breaking whatever event just fired this.
import { resumeAudio, sharedAudioContext } from '../canvas/audio'
import { loadVoiceSettings, type StorageLike } from '../voice/narrator'

/** The whole named palette this app plays. Every mechanic in the pre-writing
 *  stage that ends in a small win (or, for `wrong`, a gentle non-outcome)
 *  gets exactly one name here — call sites never build their own notes. */
export type SfxName =
  | 'collect'
  | 'clean'
  | 'found'
  | 'spine'
  | 'snakeColour'
  | 'right'
  | 'wrong'
  | 'rescue'
  | 'tap'
  | 'notebook'

/** One oscillator's own short life inside a sound. `sweepTo`, when present,
 *  glides `freq` → `sweepTo` over the note's own `duration` — the "bloop"/
 *  "shimmer" character several entries below want, with no second node. */
export interface SfxNote {
  readonly type: OscillatorType
  /** Start frequency, Hz. */
  readonly freq: number
  /** End frequency for a pitch glide; omitted for a flat note. */
  readonly sweepTo?: number
  /** Offset from the SOUND's own start (not from `AudioContext.currentTime`),
   *  seconds — lets a def place several notes in sequence or in a chord. */
  readonly start: number
  /** This note's own length, seconds; the attack/release envelope fits
   *  entirely inside it (see `scheduleNote`). */
  readonly duration: number
  /** Relative peak, `0..1`. The REAL output peak is this times
   *  `MASTER_GAIN` — never authored directly — so nothing in this file can
   *  ever clip regardless of what a future entry picks here. */
  readonly peak: number
}

export interface SfxDef {
  readonly notes: readonly SfxNote[]
}

/** The one volume knob every note in this module answers to (task brief:
 *  "master gain low, ~0.2"). A note's own `peak` is a FRACTION of this, so
 *  the loudest anything can ever play is `MASTER_GAIN` itself — the "limiter
 *  or low peak" the brief asks for, done by construction rather than by a
 *  runtime `DynamicsCompressorNode` this app's small palette does not need. */
export const MASTER_GAIN = 0.2

/** Exponential ramps can approach but never CROSS zero — every envelope
 *  below starts/ends here instead, the same convention `canvas/traceTone.ts`
 *  and `modes/tone.ts` already use. */
const SILENCE = 0.0001

const SEMITONE = Math.pow(2, 1 / 12)

/** `collect` rises a little with each item gathered THIS LEVEL (task brief:
 *  "pitch rising slightly with each item collected") — capped after a
 *  handful of steps so a long collect level never drifts into an ultrasonic
 *  whistle. `index` is 0 for the first item, 1 for the second, and so on;
 *  anything past the cap holds at the capped pitch rather than climbing
 *  forever. */
const COLLECT_BASE_FREQ = 560 // C#5-ish: bright without being shrill
const COLLECT_STEP_SEMITONES = 1
const COLLECT_MAX_STEPS = 5

/** A bright pop/bloop: a quick upward chirp plus a brief high overtone —
 *  the "pop" reads as the chirp's own attack, the "bloop" as the overtone
 *  trailing half a beat behind it. Pure and exported so the rising pitch is
 *  directly testable without touching any audio node. */
export function collectDef(index = 0): SfxDef {
  const steps = Math.min(Math.max(Math.trunc(index), 0), COLLECT_MAX_STEPS)
  const freq = COLLECT_BASE_FREQ * Math.pow(SEMITONE, steps * COLLECT_STEP_SEMITONES)
  return {
    notes: [
      { type: 'sine', freq, sweepTo: freq * 1.18, start: 0, duration: 0.12, peak: 0.75 },
      { type: 'sine', freq: freq * 1.5, start: 0.03, duration: 0.09, peak: 0.4 },
    ],
  }
}

/** Every OTHER sound is a fixed shape — no per-call parameter needed. */
const FIXED_PALETTE: Readonly<Record<Exclude<SfxName, 'collect'>, SfxDef>> = {
  // A soft sparkle when a cleaning level (glass/sand/mud/leaves) finishes:
  // three quick high notes climbing a triad, triangle for a glassy edge
  // `sine` does not have.
  clean: {
    notes: [
      { type: 'triangle', freq: 1046.5, start: 0, duration: 0.09, peak: 0.45 },
      { type: 'triangle', freq: 1318.5, start: 0.05, duration: 0.09, peak: 0.4 },
      { type: 'triangle', freq: 1568.0, start: 0.1, duration: 0.12, peak: 0.35 },
    ],
  },
  // A warm chime for a hidden object found in the dark: one note gliding
  // gently up, plus a soft octave-below partner for warmth.
  found: {
    notes: [
      { type: 'sine', freq: 784.0, sweepTo: 880.0, start: 0, duration: 0.18, peak: 0.6 },
      { type: 'sine', freq: 392.0, start: 0, duration: 0.2, peak: 0.25 },
    ],
  },
  // A tiny click-pop per accepted hedgehog spine — the shortest sound in the
  // palette on purpose: it repeats often, one or two spines per level.
  spine: {
    notes: [{ type: 'triangle', freq: 900, sweepTo: 700, start: 0, duration: 0.05, peak: 0.5 }],
  },
  // A short rising shimmer when a snake is fully coloured: one wide glide
  // plus a light high shimmer trailing it.
  snakeColour: {
    notes: [
      { type: 'sine', freq: 440, sweepTo: 880, start: 0, duration: 0.22, peak: 0.6 },
      { type: 'sine', freq: 1320, start: 0.1, duration: 0.14, peak: 0.3 },
    ],
  },
  // A happy two-note "ta-da" on a correct deduction: a rising major third.
  right: {
    notes: [
      { type: 'sine', freq: 523.25, start: 0, duration: 0.12, peak: 0.75 },
      { type: 'sine', freq: 659.25, start: 0.11, duration: 0.2, peak: 0.75 },
    ],
  },
  // `docs/01` principle 2: NO failure sound, no buzzer, no descending run —
  // a wrong pick is a structural non-event (D4, `screen/Deduction.tsx`'s own
  // header: "a wrong pick costs nothing"). This is a soft, LOW, NEUTRAL hum:
  // two close low partials starting at the SAME instant (never sequential,
  // so there is no interval to read as descending at all) with a gentle
  // attack/release and a short life — closer to a quiet "hmm" than any kind
  // of alert.
  wrong: {
    notes: [
      { type: 'sine', freq: 196.0, start: 0, duration: 0.22, peak: 0.4 },
      { type: 'sine', freq: 207.65, start: 0, duration: 0.22, peak: 0.3 },
    ],
  },
  // A short fanfare (3-5 notes) for the rescue closing: a rising major
  // arpeggio, the last note held a touch longer. Deliberately the one entry
  // allowed past the ~400ms per-sound budget (see `sfx.test.ts`) — a fanfare
  // this short would not read as one at all.
  rescue: {
    notes: [
      { type: 'sine', freq: 523.25, start: 0, duration: 0.14, peak: 0.7 },
      { type: 'sine', freq: 659.25, start: 0.1, duration: 0.14, peak: 0.7 },
      { type: 'sine', freq: 784.0, start: 0.2, duration: 0.14, peak: 0.7 },
      { type: 'sine', freq: 1046.5, start: 0.32, duration: 0.3, peak: 0.7 },
    ],
  },
  // A subtle tick for a chrome button tap — the quietest, shortest entry:
  // this one plays the most often of all ten.
  tap: {
    notes: [{ type: 'triangle', freq: 1200, start: 0, duration: 0.03, peak: 0.3 }],
  },
  // A page-flip swish for opening the notebook: a quick downward glide, high
  // register — reads as paper, not as `wrong`'s low neutral hum (different
  // register, a third of the duration, no held peak).
  notebook: {
    notes: [{ type: 'sine', freq: 1200, sweepTo: 700, start: 0, duration: 0.09, peak: 0.35 }],
  },
}

/** The full palette, `collect` included at its RESTING (first-item) pitch —
 *  the one callers reach for when they want "the def", e.g. every palette
 *  assertion in `sfx.test.ts`. Playing `collect` for a real level instead
 *  goes through {@link collectDef} with that level's own running index. */
export const SFX_PALETTE: Readonly<Record<SfxName, SfxDef>> = {
  ...FIXED_PALETTE,
  collect: collectDef(0),
}

/** This def's own total length — the last note's `start + duration`. Pure,
 *  so the "≤ ~400ms" budget is a plain assertion in `sfx.test.ts`, no audio
 *  node involved. */
export function sfxDuration(def: SfxDef): number {
  return def.notes.reduce((max, note) => Math.max(max, note.start + note.duration), 0)
}

/** This def's own loudest REAL output level (a note's `peak` fraction times
 *  {@link MASTER_GAIN}) — always `≤ MASTER_GAIN` by construction, which is
 *  exactly what `sfx.test.ts` asserts for every palette entry. */
export function sfxPeakGain(def: SfxDef): number {
  return def.notes.reduce((max, note) => Math.max(max, Math.min(note.peak, 1) * MASTER_GAIN), 0)
}

/** Every frequency a def ever touches (`freq` and, for a glide, `sweepTo`
 *  too) — what `sfx.test.ts` checks against the "pleasant range" bound. */
export function sfxFrequencies(def: SfxDef): number[] {
  return def.notes.flatMap((note) => (note.sweepTo === undefined ? [note.freq] : [note.freq, note.sweepTo]))
}

/** Is the shared narrator mute currently ON? SFX reuses the SAME persisted
 *  flag `voice/narrator.ts` reads (`cursiva.voice.v1`) rather than a second
 *  setting — task brief: "ONE mute for everything". `storage` is injectable
 *  only for tests, same convention as `narrator.ts`'s own functions. */
export function isSfxMuted(storage?: StorageLike | null): boolean {
  return loadVoiceSettings(storage).muted
}

/** Is this tab currently in the background? Read live rather than tracked
 *  through a `visibilitychange` listener — a hidden document always reports
 *  `document.hidden === true` at the moment something tries to play, so
 *  there is nothing a listener would tell this function that reading the
 *  property itself does not already say, and no listener means nothing here
 *  needs its own cleanup. `false` outside a browser (SSR, node tests): there
 *  is no "hidden tab" concept to gate on there, and every OTHER guard
 *  (`sharedAudioContext` returning `null`) already keeps those environments
 *  silent. */
function isPageHidden(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return document.hidden === true
  } catch {
    return false // a hostile/partial `document` double: never block on it
  }
}

/** Schedule one note's own oscillator + gain envelope, `origin` seconds
 *  after `ctx`'s own clock zero. A stepped gain clicks (the same reason
 *  `canvas/traceTone.ts` ramps instead of stepping), so both edges are
 *  exponential ramps out of/into {@link SILENCE}, never a `setValueAtTime`
 *  jump. Best-effort per note: one throwing node must not cancel the notes
 *  around it. */
function scheduleNote(ctx: AudioContext, note: SfxNote, origin: number): void {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t0 = origin + note.start
    const peak = Math.min(note.peak, 1) * MASTER_GAIN
    osc.type = note.type
    osc.frequency.setValueAtTime(note.freq, t0)
    if (note.sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(note.sweepTo, 1), t0 + note.duration)
    }
    gain.gain.setValueAtTime(SILENCE, t0)
    // Attack: fast but never instant (a stepped gain clicks); release: the
    // rest of the note's own duration.
    const attack = Math.min(0.02, note.duration / 3)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, SILENCE), t0 + attack)
    gain.gain.exponentialRampToValueAtTime(SILENCE, t0 + note.duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + note.duration + 0.02)
  } catch {
    // best-effort: a sound effect must never break the event it decorates
  }
}

export interface PlaySfxOptions {
  /** Inject a fake context for a test, or `null` to assert the no-audio
   *  path; omitted (the production default) resolves the shared context. */
  ctx?: AudioContext | null
  /** For `collect` only: this level's own running collected-item count
   *  (0 for the first item). Ignored by every other name. */
  index?: number
  /** Test-only mute override, same convention as `narrator.ts`. */
  storage?: StorageLike | null
}

/**
 * Play one named sound from the palette. No-ops — never throws — when the
 * narrator is muted, the tab is hidden, or this device has no Web Audio at
 * all; every one of those is a normal, expected silence, not a failure.
 *
 * Callers fire this from an EVENT or a state TRANSITION (an item just
 * flipped to collected, a case just closed), never from render — see
 * {@link onRisingEdge} for the one-shot gate every completion-style call
 * site in this app uses to guarantee that.
 */
export function playSfx(name: SfxName, options: PlaySfxOptions = {}): void {
  if (isSfxMuted(options.storage)) return
  if (isPageHidden()) return
  const def = name === 'collect' ? collectDef(options.index ?? 0) : FIXED_PALETTE[name]
  const audio = options.ctx === undefined ? sharedAudioContext() : options.ctx
  if (!audio) return
  try {
    resumeAudio(audio) // autoplay policy, best-effort
    const origin = audio.currentTime
    for (const note of def.notes) scheduleNote(audio, note, origin)
  } catch {
    // best-effort: audio must never break the event loop that asked for it
  }
}

/**
 * The shared "edge, not level" gate: calls `onRise` the FIRST time `next` is
 * `true` while `prev` was `false`, and never again while it stays `true` —
 * exactly the guard a completion sound (a cleaning level fully revealed, a
 * snake fully coloured) needs to fire once per transition instead of once
 * per re-render or per still-true frame. Pure: the caller owns `prev` (a ref
 * of the previous tick's own boolean) and passes both sides in on every
 * tick; this function holds no state of its own.
 */
export function onRisingEdge(prev: boolean, next: boolean, onRise: () => void): void {
  if (!prev && next) onRise()
}
