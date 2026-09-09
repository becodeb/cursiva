// Timed-hazard geometry (docs/08 section 5, `f1-pelotas`; docs/01 phase 1,
// "inhibición motriz"). A hazard is DATA on the level (`Obstacle`) and its
// position at a given instant is derived here — the same way a corridor is
// derived from a path in `buildLevel.ts`. The engine never stores where a ball
// is; it asks.
//
// PURE AND DETERMINISTIC. Nothing in this file reads a clock: `timeMs` comes in
// as an argument, so one rAF clock upstream can drive the drawing and the
// scoring from the SAME number, and a test can ask what the sheet looks like at
// t = 1300ms without waiting 1300ms. A hazard that consulted `Date.now()` would
// be untestable and, worse, would let the picture and the hit test disagree by
// a frame — which on a reset-on-contact level is the difference between a fair
// rule and a bug.
import type { LevelTarget, Obstacle } from './types'

/**
 * Extra contact radius, in viewBox units, granted to the child's trace.
 *
 * The finger does not draw a mathematical point: the ink is rendered ~18 units
 * wide, so its half-width alone is 9. Scoring a hit only when the sampled
 * CENTRE of the trace reaches the ball would let a visibly overlapping stroke
 * sail through, and on a level whose whole rule is "the ball sends you back"
 * that reads as the game cheating. 12 units is the ink half-width plus three
 * units of grace, so the run resets when the child can SEE the touch.
 *
 * It is deliberately small against the 32-unit hazard radius (a 37% widening):
 * large enough to match the drawing, too small to turn the ball into an
 * invisible wall wider than itself.
 */
export const OBSTACLE_INK_ALLOWANCE = 12

/** A point on the route plus its unit tangent, at a given arc length. */
interface Anchor {
  x: number
  y: number
  tx: number
  ty: number
}

/**
 * Walk `polyline` to the point at arc length `distance`, and report the local
 * unit tangent there — the direction of the segment the point falls on.
 *
 * The tangent is what makes the hazard CROSS the channel instead of sliding
 * along it, so it is taken from the route itself rather than assumed to be
 * horizontal. On the shipped arch route the tangent at the first hazard leans
 * about 38 degrees, and a hazard that ignored that would travel diagonally down
 * the corridor and never block it.
 */
function anchorAt(target: LevelTarget, distance: number): Anchor {
  const points = target.polyline
  if (points.length === 0) return { x: 0, y: 0, tx: 1, ty: 0 }
  if (points.length === 1) return { x: points[0].x, y: points[0].y, tx: 1, ty: 0 }

  let remaining = Math.max(0, distance)
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]
    const b = points[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const segment = Math.hypot(dx, dy)
    if (segment === 0) continue
    if (remaining <= segment) {
      const t = remaining / segment
      return { x: a.x + dx * t, y: a.y + dy * t, tx: dx / segment, ty: dy / segment }
    }
    remaining -= segment
  }
  // Past the end (or a zero-length route): sit on the last point, keeping the
  // last real direction so the perpendicular stays meaningful.
  const last = points[points.length - 1]
  for (let i = points.length - 1; i > 0; i--) {
    const dx = last.x - points[i - 1].x
    const dy = last.y - points[i - 1].y
    const segment = Math.hypot(dx, dy)
    if (segment > 0) return { x: last.x, y: last.y, tx: dx / segment, ty: dy / segment }
  }
  return { x: last.x, y: last.y, tx: 1, ty: 0 }
}

/**
 * Centre of a hazard at time `timeMs`, in viewBox coordinates.
 *
 * The centre sits at arc length `at · target.length` along `target.polyline`,
 * displaced along the LOCAL PERPENDICULAR by
 * `travel/2 · sin(2π · (timeMs / periodMs + phase))`.
 *
 * `at` is clamped to `[0, 1]` and a non-positive `periodMs` freezes the hazard
 * on the route rather than producing a NaN: an authoring mistake must make the
 * level easier, never make the sheet disappear (same contract as the catalog's
 * degraded paths, catalog.ts).
 */
export function obstacleAt(
  obstacle: Obstacle,
  target: LevelTarget,
  timeMs: number,
): { x: number; y: number } {
  const at = Math.max(0, Math.min(1, obstacle.at))
  const anchor = anchorAt(target, at * target.length)
  // Unit normal of the route: rotate the tangent a quarter turn.
  const nx = -anchor.ty
  const ny = anchor.tx
  const offset =
    obstacle.periodMs > 0
      ? (obstacle.travel / 2) *
        Math.sin(2 * Math.PI * (timeMs / obstacle.periodMs + obstacle.phase))
      : 0
  return { x: anchor.x + nx * offset, y: anchor.y + ny * offset }
}

/**
 * Index of the FIRST hazard the point is touching, or -1.
 *
 * "Touching" is a circle test against `radius + OBSTACLE_INK_ALLOWANCE`. The
 * first index wins because the caller only needs to know THAT the run resets,
 * and hazards on a phase-1 route are far enough apart to never overlap anyway.
 */
export function hitObstacle(
  point: { x: number; y: number },
  obstacles: readonly Obstacle[],
  target: LevelTarget,
  timeMs: number,
): number {
  // A `free` level derives an EMPTY target (buildLevel.ts). `obstacleAt` then
  // degenerates to the origin, and testing against it would invent a hazard in
  // the top-left corner of a sheet that has no route at all.
  if (target.polyline.length === 0) return -1
  for (let i = 0; i < obstacles.length; i++) {
    const centre = obstacleAt(obstacles[i], target, timeMs)
    const reach = obstacles[i].radius + OBSTACLE_INK_ALLOWANCE
    if (Math.hypot(point.x - centre.x, point.y - centre.y) <= reach) return i
  }
  return -1
}
