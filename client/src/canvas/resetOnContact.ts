// Reset-on-contact rule (`LevelConfig.resetOnContact`, docs/01 principle 2).
//
// Touching a wall or a hazard sends the run back to the start. That is a RULE,
// not a scolding: nothing turns red, nothing sounds like failure and no score
// is deducted — the attempt simply begins again. Principle 2 forbids punishing
// the child, not letting the level have consequences.
//
// This module is the DEBOUNCE, and it exists because the contact signal is
// sampled at ~10 Hz off a single moving fingertip (docs/02 §7.2). One stray
// sample — a finger rolling on the glass, a jittery digitiser, a corner clipped
// by two viewBox units — is not a child leaving the corridor, and resetting a
// child who is actually inside is the one failure mode this rule cannot afford.
// So contact must HOLD across consecutive samples before the run restarts.
//
// Pure and DOM-free: the screen owns the clock and the cloud lookup, this owns
// the decision.

/**
 * Consecutive contact samples required before the run restarts.
 *
 * Two, at the ~10 Hz sampling rate, means contact must persist for roughly
 * 100–200 ms. One sample would fire on digitiser jitter; three would let a
 * child cross a whole hazard between samples at tracing speed, which would
 * make the rule feel arbitrary — the worst outcome of all, because a rule a
 * six-year-old cannot predict reads exactly like a punishment.
 */
export const RESET_CONTACT_TICKS = 2

/** Debounce state carried between samples. */
export interface ResetDebounce {
  /** How many consecutive samples have reported contact. */
  readonly consecutive: number
  /** True on the sample that trips the reset — an EDGE, never a level. */
  readonly reset: boolean
}

/** No contact seen. The state a run starts in, and returns to on finger-up. */
export const NO_CONTACT: ResetDebounce = { consecutive: 0, reset: false }

/**
 * Fold one ~10 Hz sample into the debounce.
 *
 * `contact` is "the fingertip is outside the corridor OR inside a hazard" —
 * both conditions ride the SAME sample, because a second cloud scan per channel
 * is the cost docs/02 §7.2 exists to refuse.
 *
 * The tripping sample returns to zero rather than staying latched: a child who
 * keeps a finger on a wall must not be restarted ten times a second, and after
 * a restart the run has to earn its next reset from scratch.
 */
export function contactTick(
  previous: ResetDebounce,
  contact: boolean,
  ticks: number = RESET_CONTACT_TICKS,
): ResetDebounce {
  if (!contact) return NO_CONTACT
  const consecutive = previous.consecutive + 1
  if (consecutive >= Math.max(1, ticks)) return { consecutive: 0, reset: true }
  return { consecutive, reset: false }
}
