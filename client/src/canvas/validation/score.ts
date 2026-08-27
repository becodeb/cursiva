// Geometric score per trace-validation spec (FORMULA AUTHORITY, design flag 5:
// docs/02 renders the formula without the ×100 factor; the spec carries it and
// score is normalized to the 0–100 percentage scale).
import type { Point } from '../../letters/types'
import { TolPen, TolTouch } from './constants'

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/**
 * Score a resampled user stroke against the ideal sampled to K points:
 *
 *   Score = max(0, 100 − 100·Σᵢ dist(User[i], Ideal[i]) / (K · Tol))
 *         = max(0, 100 − 100·meanDev / Tol)
 *
 * Index-wise pairing; both inputs are K-point resamples (resample/samplePath,
 * dep T3.2). The ×100 factor is mandatory: 5 px mean deviation scores 58.3
 * under pen (TolPen 12, <70 rejected) and 72.2 under touch (TolTouch 18,
 * ≥70 approved). Clamped to [0, 100]. Empty input scores 0 — a defensive
 * floor, never an approval (callers skip evaluation when resample is null).
 */
export function score(user: Point[], ideal: Point[], tolerance: number): number {
  if (user.length === 0 || ideal.length === 0) return 0
  const n = Math.min(user.length, ideal.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += dist(user[i], ideal[i])
  }
  const meanDev = sum / n
  return Math.max(0, Math.min(100, 100 - (100 * meanDev) / tolerance))
}

/** Score with the DESIGN-FIXED touch tolerance (pointerType `touch`). */
export function touchScore(user: Point[], ideal: Point[]): number {
  return score(user, ideal, TolTouch)
}

/** Score with the DESIGN-FIXED pen tolerance (pointerType `mouse` | `pen`). */
export function penScore(user: Point[], ideal: Point[]): number {
  return score(user, ideal, TolPen)
}