// The idle nudge's own timing (`odd/tasks/prewriting-stage-completion.md`
// T33): a stuck six-year-old on a silent tablet gets no feedback at all
// today — no wall, no timer, nothing tells them the level is still waiting
// for a first touch. This module is the pure clock behind "no touch for
// ~6s -> show where to begin, gently repeated; the spoken hint itself
// repeats at most every ~20s" — no React, no DOM, no `Date.now()`/
// `performance.now()` call anywhere in it, the same discipline
// `levels/revealGrid.ts`'s own `growthFraction`/`nightHintIndex` hold to:
// every timestamp this file reasons about is the CALLER's clock, handed in
// as a plain elapsed-milliseconds number, so a test can assert exact frames
// without faking a browser clock at all.
//
// Deliberately a set of pure SELECTORS over "how long has it been", not a
// stateful reducer stepped by deltas: `idleNudgePhase`/`idleNudgeCueIndex`
// are both `f(elapsedSinceTouchMs) -> value`, so a caller polling on a
// plain `setInterval` never needs to carry its own accumulator or worry
// about a missed tick drifting the schedule — the answer is always exactly
// what a fresh read of the wall clock says it should be, this tick or any
// other.
//
// T33's own "idle → nudge → cooldown" wording is TWO states here, not
// three: the wait AFTER a cue plays IS the next cue's own cooldown (both are
// "no touch, cue not showing right now") — `idleNudgePhase` returns
// `'idle'` for both the FIRST wait and every gap between two cues, and
// `'nudge'` only for the `cueMs` window a cue is actually playing.
// `idleNudgeCueIndex` is what tells the two idle STRETCHES apart when a
// caller needs to (a fresh mount vs. "the third cue is about to play"),
// without a third named phase.

/** Timing knobs, in milliseconds — every default matches the task's own
 *  "~6 s" / "~20 s" almost exactly, kept as an overridable config rather
 *  than bare constants purely so `idleNudge.test.ts` can exercise the
 *  formulas at small, fast numbers instead of literally waiting out 6s/20s
 *  worth of simulated ticks. */
export interface IdleNudgeConfig {
  /** How long the sheet must go untouched before the FIRST cue plays. */
  readonly idleMs: number
  /** How long one cue's own animation plays before the next idle stretch
   *  starts counting toward the next one. */
  readonly cueMs: number
  /** The spoken hint's own minimum gap between two utterances — independent
   *  of how often the VISUAL cue itself repeats (T33: "the narrator repeats
   *  the level's short hint ONCE… at most every 20 s"). */
  readonly hintCooldownMs: number
}

export const DEFAULT_IDLE_NUDGE_CONFIG: IdleNudgeConfig = {
  idleMs: 6000,
  cueMs: 2200,
  hintCooldownMs: 20000,
}

export type IdleNudgePhase = 'idle' | 'nudge'

/**
 * The phase at `elapsedSinceTouchMs` — `'idle'` before the first threshold
 * and in every gap between two cues, `'nudge'` for `cueMs` every `idleMs`
 * after that: `idle(6s) -> nudge(2.2s) -> idle(6s) -> nudge(2.2s) -> ...`,
 * looping for as long as the child never touches the sheet. A touch resets
 * the caller's own `elapsedSinceTouchMs` back to 0 (this file owns no
 * mutable state to reset) — see this file's own header for why the clock is
 * the caller's, not this module's.
 *
 * Negative input reads as `'idle'` (never NaN/negative durations leaking
 * into a caller's render), the same defensive floor `growthFraction`
 * (`levels/revealGrid.ts`) applies to its own elapsed argument.
 */
export function idleNudgePhase(
  elapsedSinceTouchMs: number,
  config: IdleNudgeConfig = DEFAULT_IDLE_NUDGE_CONFIG,
): IdleNudgePhase {
  const elapsed = Math.max(0, elapsedSinceTouchMs)
  if (elapsed < config.idleMs) return 'idle'
  const period = config.idleMs + config.cueMs
  const intoPeriod = (elapsed - config.idleMs) % period
  return intoPeriod < config.cueMs ? 'nudge' : 'idle'
}

/**
 * Which cue OCCURRENCE is current, 0-based — `-1` before the first
 * threshold is ever reached. This increases by exactly one every
 * `idleMs + cueMs`, and stays flat across every poll that falls inside the
 * SAME occurrence (whether that poll lands in its `'nudge'` window or the
 * idle gap right after it, waiting for the next one). A caller uses a
 * CHANGE in this number — not `idleNudgePhase` alone, which repeats
 * `'nudge'` across many polls of one occurrence — to fire a one-shot effect
 * (playing the cue's own mount animation, deciding whether to (re)speak the
 * hint) exactly once per occurrence rather than once per poll.
 */
export function idleNudgeCueIndex(
  elapsedSinceTouchMs: number,
  config: IdleNudgeConfig = DEFAULT_IDLE_NUDGE_CONFIG,
): number {
  const elapsed = Math.max(0, elapsedSinceTouchMs)
  if (elapsed < config.idleMs) return -1
  const period = config.idleMs + config.cueMs
  return Math.floor((elapsed - config.idleMs) / period)
}

/**
 * Whether the hint should be (re)spoken for a FRESH cue occurrence — at
 * most every `hintCooldownMs`, regardless of how often the visual cue
 * itself repeats. A caller calls this only once per `idleNudgeCueIndex`
 * rising edge (never once per poll, or a still-showing cue would retrigger
 * speech on every tick) and, on `true`, is the one that stamps its own
 * "last spoken at" clock — this function reads that gap, it never writes
 * it, so it stays a pure predicate with no memory of its own.
 */
export function shouldSpeakIdleHint(
  elapsedSinceHintMs: number,
  config: IdleNudgeConfig = DEFAULT_IDLE_NUDGE_CONFIG,
): boolean {
  return elapsedSinceHintMs >= config.hintCooldownMs
}
