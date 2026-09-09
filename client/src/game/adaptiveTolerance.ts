// Adaptive tolerance and coaching (docs/03 section 4, docs/08 section 4).
//
//   3 fallos seguidos                     → canal ×1.25 (máximo ×2 acumulado)
//   2 aprobaciones seguidas               → vuelve al ancho nominal
//   3 aprobaciones seguidas en el nominal → canal ×0.85 (mínimo ×0.7)
//
// "La app NUNCA bloquea. Se registra que el nivel necesitó ayuda; eso es dato
// para el docente, no un castigo para el chico." A stuck child always widens
// their way forward; a fluent one quietly gets a tighter corridor.
import type { LevelAttempt, LevelRecord } from './types'

/** Consecutive failures that widen the corridor. */
const FAILS_TO_WIDEN = 3
/** Consecutive passes that return the corridor to nominal. */
const PASSES_TO_RESET = 2
/** Consecutive passes at (or below) nominal that tighten the corridor. */
const PASSES_TO_NARROW = 3

const WIDEN_STEP = 1.25
const NARROW_STEP = 0.85
/** Accumulated multiplier bounds — the corridor never leaves [0.7, 2] of nominal. */
export const MAX_WIDTH_FACTOR = 2
export const MIN_WIDTH_FACTOR = 0.7

/**
 * Fold one attempt into a level's persisted record. PURE: returns a NEW record
 * and never mutates the input, so the caller owns persistence.
 *
 * `bestAccuracy` / `bestFluency` are MONOTONIC maxima — mastery, not last
 * attempt, exactly like the per-letter progress store.
 */
export function applyAttempt(record: LevelRecord, attempt: LevelAttempt): LevelRecord {
  const next: LevelRecord = {
    ...record,
    attempts: record.attempts + 1,
    bestAccuracy: Math.max(record.bestAccuracy, attempt.accuracy),
    bestFluency: Math.max(record.bestFluency, attempt.fluency),
  }

  if (attempt.approved) {
    next.approvals = record.approvals + 1
    next.streakPass = record.streakPass + 1
    next.streakFail = 0

    // Two passes in a row: whatever help the child was given is no longer
    // needed — the corridor returns to its authored width.
    if (next.streakPass >= PASSES_TO_RESET && next.widthFactor > 1) {
      next.widthFactor = 1
    }
    // Three passes in a row at the nominal width (or already tighter): the
    // level quietly gets harder, floored so it stays traceable.
    if (next.streakPass >= PASSES_TO_NARROW && next.widthFactor <= 1) {
      next.widthFactor = Math.max(MIN_WIDTH_FACTOR, next.widthFactor * NARROW_STEP)
      next.streakPass = 0 // the next narrowing needs three FRESH passes
    }
    return next
  }

  next.streakFail = record.streakFail + 1
  next.streakPass = 0
  // The third consecutive failure widens the corridor. The counter resets so
  // another three failures are needed before it widens again — the level never
  // blocks, it just keeps meeting the child.
  if (next.streakFail >= FAILS_TO_WIDEN) {
    next.widthFactor = Math.min(MAX_WIDTH_FACTOR, next.widthFactor * WIDEN_STEP)
    next.streakFail = 0
  }
  return next
}

/**
 * The single short line shown after an attempt (docs/03 section 7).
 *
 * "Nunca 'mal', nunca rojo, nunca un sonido de error. Cuando falta un pilar, el
 * mensaje nombra EL GESTO, no el fracaso." So every branch below is an
 * invitation to move differently, never a verdict on the attempt.
 *
 * An inverted turn is named FIRST even when it did not block approval: it is
 * the most expensive error in cursive (a clockwise `a` can look perfect and
 * will never link), and the level may not be enforcing order yet.
 */
export function coachMessage(attempt: LevelAttempt): string {
  if (attempt.approved) return '¡Muy bien!'
  if (attempt.wrongDirection) return 'Probá al revés: seguí la flecha desde el punto verde.'
  if (attempt.failedPillar === 'fluency') {
    return attempt.extraLifts > 0
      ? 'Casi. Probá otra vez sin levantar el dedo.'
      : 'Vas bien. Probá más parejo, sin frenar.'
  }
  if (attempt.failedPillar === 'accuracy') return 'Quedate adentro del camino, despacito.'
  if (attempt.failedPillar === 'direction') {
    return 'Recorré todo el camino, desde el punto verde hasta el final.'
  }
  return 'Probá una vez más, tranquilo.'
}
