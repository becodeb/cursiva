// Geometric score (trace-validation spec, "area-cloud" model):
//
//   dist_i = min over ALL ideal cloud points of euclidean(user[i], cloudPoint)
//   penalized_i = max(0, dist_i − AREA_GRACE)
//   Score = max(0, 100 − 100·Σᵢ penalized_i / (K · Tolerance))
//
// The ideal is the REAL glyph AREA — a dense point cloud extracted from the
// Kalam-Regular font outline (see letters/ideal_a.ts, ideal_c.ts), NOT a
// thin K-point centerline. The user stroke is still resampled to K arc-length
// points (resample), but each resampled point is scored against the WHOLE cloud
// by nearest-neighbor distance: there is no index pairing, so a trace that
// covers the letter body in any parametrization scores well. A point inside the
// body (dist_i ≤ AREA_GRACE) scores as a perfect hit; only a clear miss outside
// the body is penalized. Clamped to [0, 100]; empty input scores 0 — a
// defensive floor, never an approval (callers skip evaluation when resample is
// null).
import type { Point } from '../../letters/types'
import { AREA_GRACE, TolPen, TolTouch } from './constants'

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

/**
 * Score a resampled user stroke against the dense ideal area cloud.
 *
 * `user` is the K-point resample of the captured stroke; `ideal` is the glyph
 * area cloud. Each user point scores by its nearest cloud point; the mean
 * penalized distance drives the 0–100 score. A perfect trace (points inside
 * the area, every dist_i ≤ AREA_GRACE) scores exactly 100.
 */
export function score(
  user: Point[],
  ideal: ReadonlyArray<readonly [number, number]>,
  tolerance: number,
): number {
  if (user.length === 0 || ideal.length === 0) return 0
  const n = user.length
  let sum = 0
  for (let i = 0; i < n; i++) {
    const u = user[i]
    let best = Infinity
    for (let j = 0; j < ideal.length; j++) {
      const c = ideal[j]
      const d = dist(u.x, u.y, c[0], c[1])
      if (d < best) best = d
    }
    const penalized = best > AREA_GRACE ? best - AREA_GRACE : 0
    sum += penalized
  }
  return Math.max(0, Math.min(100, 100 - (100 * sum) / (n * tolerance)))
}

/** Score with the DESIGN-FIXED touch tolerance (pointerType `touch`). */
export function touchScore(user: Point[], ideal: ReadonlyArray<readonly [number, number]>): number {
  return score(user, ideal, TolTouch)
}

/** Score with the DESIGN-FIXED pen tolerance (pointerType `mouse` | `pen`). */
export function penScore(user: Point[], ideal: ReadonlyArray<readonly [number, number]>): number {
  return score(user, ideal, TolPen)
}
