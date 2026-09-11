// Direction hint of a level (docs/03 §7: the child is told where to start and
// which way to go). Pure geometry, no DOM and no React — the angle a child's
// arrow points at is exactly the kind of thing that must be testable without a
// browser, like the rest of the trace engine (docs/02 §1).
import { polylineLength } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import type { LevelTarget } from '../levels/types'

/**
 * Distance from the start, in sheet units, where the direction arrow sits.
 *
 * It is an ABSOLUTE distance, not a fraction of the path, and that is the whole
 * point. A fraction travels with the length of the level: 8% of `f3-m` is still
 * inside the entry stroke, while 8% of `f5-mama` is ~290 units in — past the
 * first arch of the m, on a baseline cusp where the pen doubles back. The child
 * gets the same hint in the same place whether the level is one letter or a
 * whole word, so the anchor is measured from the start dot instead.
 *
 * 70 clears the r=22 start dot with room to spare and still lands inside the
 * entry stroke on every level in the catalog.
 */
export const ARROW_DISTANCE = 70

/** ...but never past a quarter of a path too short to spare 70 units. */
export const ARROW_MAX_FRACTION = 0.25

/** Arc length of the finite-difference span used for the tangent, in units. */
const TANGENT_SPAN_UNITS = 25

/**
 * First index at least `distance` along the polyline, or the last index when
 * the whole path is shorter than that.
 */
export function indexAtDistance(polyline: readonly Point[], distance: number): number {
  let acc = 0
  for (let i = 1; i < polyline.length; i++) {
    acc += Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y)
    if (acc >= distance) return i
  }
  return polyline.length - 1
}

/** Where the arrow sits and which way it points, in SVG `rotate` degrees. */
export interface DirectionArrow {
  x: number
  y: number
  angle: number
}

/**
 * Local tangent direction at `index`, as a `rotate(deg)` value for a shape
 * whose rest orientation points along +x.
 *
 * The convention is SVG's, not trigonometry's: `y` grows DOWNWARD and
 * `rotate(deg)` turns CLOCKWISE, and those two inversions cancel. So
 * `atan2(dy, dx)` — plain, unswapped, unnegated — is already the right value:
 * `rotate(θ)` maps `(1, 0)` to `(cos θ, sin θ)`, which is the tangent itself.
 * A path descending to the right yields a POSITIVE angle and the arrow points
 * down-right; one rising to the right yields a NEGATIVE angle and it points
 * up-right.
 *
 * `span` is a forward difference over several samples, not the next point: the
 * flattened polyline is dense enough that one segment is mostly quantisation
 * noise. A degenerate pair (a repeated point) reads as 0 — pointing along the
 * writing direction is the safe answer, never a random angle.
 */
export function tangentAngleAt(polyline: readonly Point[], index: number, span: number): number {
  const step = Math.max(1, Math.round(span))
  const from = Math.max(0, Math.min(polyline.length - 1 - step, Math.round(index)))
  const a = polyline[from]
  const b = polyline[from + step]
  if (!a || !b) return 0
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return 0
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

/**
 * Direction hint a fixed distance along the level's main path, angled on the
 * local tangent. `undefined` for a path too short to have a direction at all.
 */
export function directionArrowOf(target: LevelTarget): DirectionArrow | undefined {
  const poly = target.polyline
  if (poly.length < 2) return undefined
  const total = polylineLength(poly as Point[])
  if (total <= 0) return undefined
  const at = Math.min(ARROW_DISTANCE, total * ARROW_MAX_FRACTION)
  const from = indexAtDistance(poly, at)
  // The span must advance at least one sample. On a coarse polyline — the
  // 10-point zigzag of `f1-quiebres` has a 144-unit first leg — a whole 25-unit
  // span can land inside the segment it started in, and a zero-length
  // difference would read as "straight along the writing direction" instead of
  // the corner the hand actually turns.
  const to = Math.max(from + 1, indexAtDistance(poly, at + TANGENT_SPAN_UNITS))
  const anchor = poly[from]
  return { x: anchor.x, y: anchor.y, angle: tangentAngleAt(poly, from, to - from) }
}
