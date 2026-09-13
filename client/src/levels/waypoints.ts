// The waypoint fold (`free-trail-waypoints` capability, design.md §1): a
// routeless level scored by AUTHORED targets — a start point, N flower
// waypoints, one goal (the hive) — because the mechanic here is the
// INVENTED trail itself (`docs/13` §8 row F). Pure, no React, no DOM — the
// same convention `levels/arrange.ts`'s own header states is mandatory: this
// repo's test harness is node with no jsdom and no testing-library, so a
// decision made only inside a pointer handler is invisible to every test
// that can exist.
import type { Point } from '../letters/types'
import type { ArtImage } from '../detective/assets'

/** One authored target on a routeless sheet: a point, and the radius within
 *  which the child's own trail counts as having passed THROUGH it. */
export interface Waypoint {
  readonly x: number
  readonly y: number
  readonly radius: number
}

export interface WaypointConfig {
  /** Where the carried animal RESTS before the finger moves, and where the
   *  errand begins. This is the field that repairs the carrier defect
   *  (`levels/buildLevel.ts`'s `levelStart`): `RevealObject`'s own doc
   *  comment already gives the argument — on a routeless level "there is no
   *  route to derive a position from". */
  readonly start: Point
  /** The flowers. Order is AUTHORING order, never a required visit order:
   *  `docs/13` §2 says "puede pasar por flores y llegar al panal", and the
   *  only existing touch-N-authored-points mechanic in the repo
   *  (`reveal.mode: 'light'`) is deliberately unordered too. */
  readonly stops: readonly Waypoint[]
  /** The two states of a stop's picture, and its rendered HEIGHT. ONE pair
   *  for every stop, not one per stop: this family's stops are the same
   *  object repeated. The `CLUE_ART.<kind>.art.{earned,drained}` idiom,
   *  restated. */
  readonly stopArt: { readonly dormant: ArtImage; readonly lit: ArtImage }
  readonly stopSize: number
  /** The hive. Reaching it is the errand's last target; it is NOT required
   *  to be last in time (see `stops`). */
  readonly goal: Waypoint
  readonly goalArt: ArtImage
  readonly goalSize: number
}

export interface WaypointState {
  /** Stops the trail has passed through, by index. LATCHED: the flower stays
   *  open once it opens — the light does not persist, the FINDING does
   *  (`revealGrid.ts`'s own words for `lit`). */
  readonly lit: ReadonlySet<number>
  /** Whether the hive has been reached. Latched for the same reason. */
  readonly home: boolean
  /** How many points of the CURRENT stroke are already folded. The fold
   *  re-reads `points[seen - 1]` as the next window's origin, so no segment
   *  between two samples is skipped — `corridorTrackRef`'s own convention
   *  (`LevelPlay.tsx`'s `onFrame`). Only ever advances alongside a genuine
   *  latch, which is what keeps `waypointTick`'s no-op contract exact: an
   *  idle stretch simply re-tests the same trailing window next frame,
   *  never skipping a segment and never returning a changed reference for
   *  nothing. */
  readonly seen: number
}

export const EMPTY_WAYPOINTS: WaypointState = { lit: new Set(), home: false, seen: 0 }

/** Distance from `p` to the segment `ab` — the honest distance to a
 *  polyline, degrading to the point distance when `a === b`. */
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Did this polyline pass within `w.radius` of `w`? Point-to-SEGMENT distance
 * over consecutive samples, not point-to-SAMPLE.
 *
 * `revealGrid.ts`'s `objectLitByWindow` tests the samples alone, and for a
 * 200-unit torch that is harmless. Here it is not: at the ~30 Hz `onFrame`
 * throttle a moving finger puts consecutive samples tens of units apart, and
 * `bee4`'s radius is 38 — so a sample-only test would make the latch
 * FRAME-RATE DEPENDENT, and worse, would let the live latch disagree with
 * `waypointScore`'s own recomputation over the settled strokes. Testing the
 * segment makes the two agree BY CONSTRUCTION. A one-point stroke degrades
 * to the point test, which is the right limit.
 */
export function trailPasses(w: Waypoint, points: readonly Point[]): boolean {
  if (points.length === 0) return false
  if (points.length === 1) {
    return Math.hypot(points[0].x - w.x, points[0].y - w.y) <= w.radius
  }
  for (let i = 1; i < points.length; i++) {
    if (distToSegment({ x: w.x, y: w.y }, points[i - 1], points[i]) <= w.radius) return true
  }
  return false
}

/**
 * One `onFrame` sample. Monotone, and returns the SAME REFERENCE when
 * nothing latches — `revealTick`/`clueTick`'s contract, restated, so an idle
 * finger costs a no-op `setState`. `drawing === false` resets `seen` and
 * joins nothing across the lift: the same pen-lift rule `coverage.ts` states,
 * because a bee does not fly between two places the finger never travelled.
 */
export function waypointTick(
  prev: WaypointState,
  points: readonly Point[],
  drawing: boolean,
  cfg: WaypointConfig,
): WaypointState {
  if (!drawing) {
    if (prev.seen === 0) return prev
    return { ...prev, seen: 0 }
  }
  if (points.length === 0) return prev

  const from = Math.max(0, prev.seen - 1)
  const window = points.slice(from)
  if (window.length === 0) return prev

  let lit = prev.lit
  let latched = false
  for (let i = 0; i < cfg.stops.length; i++) {
    if (lit.has(i)) continue
    if (trailPasses(cfg.stops[i], window)) {
      if (!latched) {
        lit = new Set(lit)
        latched = true
      }
      lit.add(i)
    }
  }
  const home = prev.home || trailPasses(cfg.goal, window)

  if (!latched && home === prev.home) return prev
  return { lit, home, seen: points.length }
}

/**
 * The accuracy pillar for a waypoint level: the fraction of the ERRAND that
 * is done, `round(100 * (lit + home) / (stops.length + 1))`.
 *
 * Recomputed PURELY from the complete stroke list at evaluation time and
 * never from the live fold — `revealScore`'s own architecture, and the
 * reason it exists: the live fold is an optimisation, the score is the
 * claim. A lift between two flowers costs nothing: each stroke is tested on
 * its own, and a flower or the hive counts as reached the moment ANY stroke
 * passes through it.
 */
export function waypointScore(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  cfg: WaypointConfig,
): number {
  const total = cfg.stops.length + 1
  let reached = 0
  for (const stop of cfg.stops) {
    if (strokes.some((stroke) => trailPasses(stop, stroke))) reached++
  }
  if (strokes.some((stroke) => trailPasses(cfg.goal, stroke))) reached++
  return Math.round((100 * reached) / total)
}

/** One render-ready picture. Structural on purpose so this module imports
 *  nothing from `canvas/` — `revealGrid.ts`'s own convention. */
export interface WaypointRender {
  readonly href: string
  readonly w: number
  readonly h: number
  readonly size: number
  readonly x: number
  readonly y: number
}

/**
 * Every waypoint's render-ready picture, dormant before a latch and lit
 * after. The GOAL is always emitted LAST — not cosmetic: it makes the
 * `<image>` index mapping in the coincidence test unambiguous
 * (`[0 .. stops.length-1]` are the stops in authored order and
 * `[stops.length]` is the hive), and it puts the hive on top if the author
 * ever overlaps two boxes.
 */
export function waypointArt(cfg: WaypointConfig, state: WaypointState): readonly WaypointRender[] {
  const stops = cfg.stops.map((stop, i) => {
    const art = state.lit.has(i) ? cfg.stopArt.lit : cfg.stopArt.dormant
    return { href: art.href, w: art.w, h: art.h, size: cfg.stopSize, x: stop.x, y: stop.y }
  })
  const goal = {
    href: cfg.goalArt.href,
    w: cfg.goalArt.w,
    h: cfg.goalArt.h,
    size: cfg.goalSize,
    x: cfg.goal.x,
    y: cfg.goal.y,
  }
  return [...stops, goal]
}

/** Every touch radius, in the SAME order as `waypointArt` — `?debug=estela`
 *  only. Derived from the same `cfg` the scorer reads, so a ring can never
 *  be drawn somewhere the scorer does not measure. */
export function waypointRings(cfg: WaypointConfig): readonly Waypoint[] {
  return [...cfg.stops, cfg.goal]
}

/** `?debug=estela:<k>` (design.md §8) — the first `k` flowers already lit,
 *  the hive reached only once `k` exceeds the stop count. Ungated: it paints
 *  render state only, adds no control, persists nothing, and must work
 *  against the exact build being screenshotted. */
export function debugWaypoints(cfg: WaypointConfig, k: number): WaypointState {
  const n = cfg.stops.length
  const clamped = Math.max(0, Math.min(n + 1, Math.trunc(k)))
  const lit = new Set<number>()
  for (let i = 0; i < Math.min(clamped, n); i++) lit.add(i)
  return { lit, home: clamped > n, seen: 0 }
}

/** The implied trail `?debug=estela:<k>` paints: `start`, then the first `k`
 *  flowers in authored order, then the hive once `k` exceeds the stop count.
 *  Render-only — never scored, never persisted. Same `k` clamp as
 *  `debugWaypoints`, so the two can never disagree about how many stops are
 *  "reached". */
export function debugTrail(cfg: WaypointConfig, k: number): readonly Point[] {
  const n = cfg.stops.length
  const clamped = Math.max(0, Math.min(n + 1, Math.trunc(k)))
  const points: Point[] = [cfg.start]
  for (let i = 0; i < Math.min(clamped, n); i++) {
    points.push({ x: cfg.stops[i].x, y: cfg.stops[i].y })
  }
  if (clamped > n) points.push({ x: cfg.goal.x, y: cfg.goal.y })
  return points
}

/** Where `?debug=estela:<k>` draws the bee: the LAST point of
 *  `debugTrail(cfg, k)` — the same number driving all three render facts, so
 *  they cannot disagree with each other (design.md §8's whole argument). */
export function debugCarrier(cfg: WaypointConfig, k: number): Point {
  const trail = debugTrail(cfg, k)
  return trail[trail.length - 1]
}

/** `initialArrange`/`seedArrange`'s own convention (`levels/arrange.ts`): the
 *  ONE function every reset site must call, so a screenshot-seeding debug
 *  count is never silently wiped by a later reset calling `EMPTY_WAYPOINTS`
 *  directly. */
export function seedWaypoints(cfg: WaypointConfig, debugCount: number | null): WaypointState {
  return debugCount !== null ? debugWaypoints(cfg, debugCount) : EMPTY_WAYPOINTS
}
