// Continuity validation (trace-validation "Continuity"): for single-stroke
// letters (`a`, `c`) the trace is one pointerdown→pointerup journey, so the
// pen "lifts" exactly where the point stream ends. The stroke is continuous
// only if the FINAL checkpoint (highest order) was reached — its radius zone
// was entered at least once before the lift. Lifting before that (e.g. right
// after checkpoint 2 of `a`) marks isContinuous = false.
//
// Order is deliberately NOT judged here — reaching the final checkpoint out of
// order is still "continuous"; wrong-direction is the order module's verdict
// (approval ANDs order + continuity + score). Entry semantics match
// checkpoints.ts: a stroke that starts inside the zone (first point counts as
// an entry) or lingers inside it does not re-trigger.
import type { LetterCheckpoint, Point } from '../../letters/types'

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/**
 * True when the stroke entered the final (highest-order) checkpoint's radius
 * before the trace ended; false when the pen lifted short of it or the input
 * is degenerate (no points / no checkpoints).
 */
export function checkContinuity(points: Point[], checkpoints: LetterCheckpoint[]): boolean {
  if (points.length === 0 || checkpoints.length === 0) return false
  const sorted = [...checkpoints].sort((a, b) => a.order - b.order)
  const final = sorted[sorted.length - 1]

  let inside = false
  for (const p of points) {
    const nowInside = dist(p, final) <= final.radius
    if (nowInside && !inside) return true
    inside = nowInside
  }
  return false
}