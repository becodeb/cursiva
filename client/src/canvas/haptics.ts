// Haptic off-path pulse (docs/01 principle 2: "Salirse del camino apaga la luz
// / atenúa el trazo, no lo marca como error"). The vibration is the same
// message as the ink dimming, delivered to the hand instead of the eye — it
// carries NO error semantics, so it fires once when the finger leaves the
// corridor and never nags while it is still outside.
//
// Best-effort by construction: `navigator.vibrate` does not exist on desktop
// Chrome without a motor, on any iOS Safari, or in the node test environment,
// and a level must play identically wherever it is missing.

/** A single short buzz. Long enough to feel through a tablet case, short enough
 * that a child who wanders keeps their attention on the ink, not the buzz. */
export const OFF_PATH_PULSE_MS = 18

/** Minimal shape of the vibration API, so a test can pass a fake. */
export interface VibrationTarget {
  vibrate?: (pattern: number | number[]) => boolean
}

/**
 * The transition-edge rule, pure and testable: pulse on the RISING edge of
 * off-path only.
 *
 * This is the whole point of the module. The off-path signal is sampled at
 * ~10 Hz (docs/02 §7), so pulsing on the level rather than the edge would fire
 * ten times a second for as long as the child stayed out — which turns a
 * neutral hint into a punishment, exactly what principle 2 forbids.
 */
export function shouldPulse(previousOffPath: boolean, offPath: boolean): boolean {
  return offPath && !previousOffPath
}

/**
 * Vibrate iff this sample is the moment the finger LEFT the corridor. Returns
 * whether a pulse was actually delivered, which is what the caller can assert;
 * a missing API is a `false`, never a throw.
 */
export function pulseOnLeaving(
  previousOffPath: boolean,
  offPath: boolean,
  target: VibrationTarget | null = typeof navigator === 'undefined' ? null : navigator,
  ms: number = OFF_PATH_PULSE_MS,
): boolean {
  if (!shouldPulse(previousOffPath, offPath)) return false
  if (!target || typeof target.vibrate !== 'function') return false
  try {
    target.vibrate(ms)
    return true
  } catch {
    // best-effort: haptics must never break the capture loop
    return false
  }
}
