// Stop segments (`docs/21_HABILIDADES_PREESCRITURA.md` §4.3, N5 and N6;
// `odd/tasks/prewriting-stage-completion.md` T45). A routed level whose
// paths are SEPARATE short strokes, each one drawn on its own: land on its
// start dot, follow it to its stop point, and lift the finger THERE. The
// skill is the one the cursive letter keeps asking for and no other level
// trains: a straight stroke with a deliberate start and a deliberate stop
// (§3.1.4, §3.2.6) — the sheep's fence posts (top to bottom) and the
// turtle's tail furrow (left to right, three stops).
//
// Judged ONCE PER RELEASE, on the stroke just released, never by re-scoring
// the canvas buffer: `onStart`'s clear-on-failed-retry empties that buffer
// before every stroke but the first (T39's root cause), and every segment
// but the last releases unapproved. Approval reads the latch
// (`screen/levelCompletion.ts`), the same move the spines made
// (`settleSpineRelease`).
//
// Pure, no DOM. The two path generators live here rather than in
// `levels/paths.ts` because they only make sense for this mechanic.
import type { Point } from '../letters/types'
import type { RouteSegment } from './types'

/** How strict a segment level is about where a stroke starts and stops. */
export interface SegmentConfig {
  /** How far from a segment's start dot the finger may land, in viewBox
   *  units. A stroke that lands further away belongs to no segment. */
  readonly startReach: number
  /** How far from a segment's stop point the finger may LIFT. Running on
   *  past the stop and lifting beyond this is the one mistake the level is
   *  about, so the segment stays open and the child tries it again. */
  readonly stopReach: number
}

/** Which segments are done. Latched: a done segment stays done for the rest
 *  of the attempt, whatever happens to the canvas's own stroke buffer. */
export interface SegmentState {
  readonly done: readonly boolean[]
}

/** The share of a stroke's samples that must lie inside the corridor. The
 *  rest is the touch-down settle and the lift flick a real finger makes. */
export const SEGMENT_MIN_INSIDE = 0.85

export function emptySegmentState(count: number): SegmentState {
  return { done: Array.from({ length: Math.max(0, count) }, () => false) }
}

export function segmentsComplete(state: SegmentState): boolean {
  return state.done.length > 0 && state.done.every(Boolean)
}

/** The nearest point of `polyline` to `p`: its distance, and how far along
 *  the route (arc length from the start) it sits. */
export function projectOnRoute(
  polyline: readonly Point[],
  p: Point,
): { distance: number; arc: number } {
  let best = { distance: Number.POSITIVE_INFINITY, arc: 0 }
  let acc = 0
  if (polyline.length === 1) return { distance: Math.hypot(p.x - polyline[0].x, p.y - polyline[0].y), arc: 0 }
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1]
    const b = polyline[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const len = Math.sqrt(len2)
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
    const distance = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
    if (distance < best.distance) best = { distance, arc: acc + t * len }
    acc += len
  }
  return best
}

/**
 * Which segment the released stroke completed, or `-1` for none.
 *
 * The stroke belongs to the not-yet-done segment whose START dot it landed
 * nearest (within `startReach`). It completes that segment when all three
 * hold:
 *
 *  - it stayed in the corridor (`SEGMENT_MIN_INSIDE` of its samples within
 *    half the corridor width of the segment's own line);
 *  - it got to the end (its furthest projection reaches within half a
 *    corridor of the stop — `detective/clues.ts`'s `trailEndArc` tolerance);
 *  - it STOPPED there: the lift point is within `stopReach` of the stop.
 *
 * `corridorWidth` is the live (adaptive) width, so a child the engine has
 * already widened the corridor for gets the same extra room here.
 */
export function judgeSegmentStroke(
  stroke: readonly Point[],
  routes: readonly RouteSegment[],
  corridorWidth: number,
  cfg: SegmentConfig,
  done: readonly boolean[] = [],
): number {
  if (stroke.length < 2) return -1
  const first = stroke[0]
  let index = -1
  let nearest = Number.POSITIVE_INFINITY
  routes.forEach((route, i) => {
    if (done[i] || route.polyline.length === 0) return
    const start = route.polyline[0]
    const d = Math.hypot(first.x - start.x, first.y - start.y)
    if (d <= cfg.startReach && d < nearest) {
      nearest = d
      index = i
    }
  })
  if (index < 0) return -1
  const route = routes[index]
  const half = corridorWidth / 2
  let inside = 0
  let maxArc = 0
  for (const p of stroke) {
    const { distance, arc } = projectOnRoute(route.polyline, p)
    if (distance <= half) {
      inside++
      maxArc = Math.max(maxArc, arc)
    }
  }
  if (inside / stroke.length < SEGMENT_MIN_INSIDE) return -1
  if (maxArc < route.length - half) return -1
  const end = route.polyline[route.polyline.length - 1]
  const last = stroke[stroke.length - 1]
  if (Math.hypot(last.x - end.x, last.y - end.y) > cfg.stopReach) return -1
  return index
}

/** Fold one released stroke into the latch. `accepted` is the segment it
 *  completed, or `-1`. Returns the SAME state when nothing changed. */
export function settleSegmentRelease(
  state: SegmentState,
  stroke: readonly Point[],
  routes: readonly RouteSegment[],
  corridorWidth: number,
  cfg: SegmentConfig,
): { state: SegmentState; accepted: number } {
  const accepted = judgeSegmentStroke(stroke, routes, corridorWidth, cfg, state.done)
  if (accepted < 0) return { state, accepted }
  return { state: { done: state.done.map((d, i) => d || i === accepted) }, accepted }
}

/** Steps per straight stroke: `flattenPathD` treats a path of fewer than
 *  three points as empty, and the demo and the checkpoints want a few
 *  points along the way anyway (`levels/paths.ts`'s `straight` does the
 *  same). */
const STRAIGHT_STEPS = 12

function r1(n: number): number {
  return Math.round(n * 10) / 10
}

/** A straight `M … L … L …` path from `a` to `b`. */
function straightStroke(a: Point, b: Point): string {
  let d = `M ${r1(a.x)} ${r1(a.y)}`
  for (let i = 1; i <= STRAIGHT_STEPS; i++) {
    const t = i / STRAIGHT_STEPS
    d += ` L ${r1(a.x + (b.x - a.x) * t)} ${r1(a.y + (b.y - a.y) * t)}`
  }
  return d
}

/** `count` vertical posts, evenly spaced from `x0` to `x1`, each drawn TOP
 *  to BOTTOM — the order a downstroke of a letter goes. */
export function fencePosts(opts: { x0: number; x1: number; top: number; bottom: number; count: number }): string[] {
  const { x0, x1, top, bottom, count } = opts
  const step = count > 1 ? (x1 - x0) / (count - 1) : 0
  return Array.from({ length: count }, (_, i) => {
    const x = x0 + i * step
    return straightStroke({ x, y: top }, { x, y: bottom })
  })
}

/** One horizontal line from `x0` to `x1`, LEFT to right, cut into `count`
 *  equal stretches with a `gap` between them: each stretch ends at a stop,
 *  and the next one starts just after it. */
export function furrowSegments(opts: { x0: number; x1: number; y: number; count: number; gap: number }): string[] {
  const { x0, x1, y, count, gap } = opts
  const len = (x1 - x0 - gap * (count - 1)) / count
  return Array.from({ length: count }, (_, i) => {
    const a = x0 + i * (len + gap)
    return straightStroke({ x: a, y }, { x: a + len, y })
  })
}

/** An axis-aligned box in sheet units. */
export interface SegmentBox {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** How much clear sheet the standing octopus keeps from a segment's own
 *  corridor (and so from its start dot, stop mark and clue marks, which all
 *  sit inside it). */
export const SEGMENT_STAND_CLEARANCE = 12

/**
 * Every segment's keep-out box: its line's bounding box grown by half the
 * corridor (the corridor itself, with its round caps) plus
 * {@link SEGMENT_STAND_CLEARANCE}. Everything a segment draws — the start
 * dot (r 22), the stop diamonds (r 34) and the clue marks (on or 10 units
 * off the line) — fits inside half a corridor of 80 or more, so staying
 * out of these boxes keeps clear of all of them.
 */
export function segmentKeepOut(routes: readonly RouteSegment[], corridorWidth: number): SegmentBox[] {
  const pad = corridorWidth / 2 + SEGMENT_STAND_CLEARANCE
  return routes.map((r) => {
    const xs = r.polyline.map((p) => p.x)
    const ys = r.polyline.map((p) => p.y)
    const x0 = Math.min(...xs) - pad
    const y0 = Math.min(...ys) - pad
    return { x: x0, y: y0, width: Math.max(...xs) + pad - x0, height: Math.max(...ys) + pad - y0 }
  })
}

function overlaps(a: SegmentBox, b: SegmentBox): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

/** The box a standing figure `height` tall and `aspect` wide-per-tall
 *  occupies with its FEET at `feet` — `canvas/placeArt.ts`'s `placeArt`
 *  with `STANDING_GRIP`, restated so `levels/` keeps importing nothing from
 *  `canvas/` (`segments.test.ts` holds the two equal). */
export function standingBox(feet: Point, height: number, aspect: number): SegmentBox {
  const width = height * aspect
  return { x: feet.x - width / 2, y: feet.y - height, width, height }
}

/**
 * T45 follow-up (coordinator review of the captures): where the octopus
 * stands on a segment level, so he never covers a start dot, a stop mark,
 * a clue or a corridor. Standing ON the first start (every other level's
 * rule) put him on top of the first post's dot. The search walks feet
 * positions outward from the first segment's start, nearest first, and
 * returns the first whose box lies inside `bounds` (the sheet, which every
 * viewport shows whole) and clear of every {@link segmentKeepOut} box.
 * `undefined` when nothing fits (a corridor widened so far there is no
 * room left): the caller keeps the default placement.
 */
export function segmentStandPoint(
  routes: readonly RouteSegment[],
  corridorWidth: number,
  height: number,
  aspect: number,
  bounds: SegmentBox,
): Point | undefined {
  const start = routes[0]?.polyline[0]
  if (!start) return undefined
  const keepOut = segmentKeepOut(routes, corridorWidth)
  const inside = (b: SegmentBox) =>
    b.x >= bounds.x && b.y >= bounds.y && b.x + b.width <= bounds.x + bounds.width && b.y + b.height <= bounds.y + bounds.height
  const STEP = 5
  const candidates: { feet: Point; d: number }[] = []
  for (let x = bounds.x; x <= bounds.x + bounds.width; x += STEP) {
    for (let y = bounds.y; y <= bounds.y + bounds.height; y += STEP) {
      candidates.push({ feet: { x, y }, d: Math.hypot(x - start.x, y - start.y) })
    }
  }
  candidates.sort((a, b) => a.d - b.d)
  for (const { feet } of candidates) {
    const box = standingBox(feet, height, aspect)
    if (inside(box) && keepOut.every((k) => !overlaps(box, k))) return feet
  }
  return undefined
}
