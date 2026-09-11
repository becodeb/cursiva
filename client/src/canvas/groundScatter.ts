// Ground scatter: where the grass tufts and the mud clumps go.
//
// WHY THIS IS SCATTER AND NOT A TEXTURE FILL. Filling a region with a repeating
// texture needs `<pattern>` plus `fill="url(#id)"`, and confining that fill to
// the corridor's irregular shape needs `<clipPath>` — both sit under this
// repo's `url(#…)` ban, scarred at `TraceCanvas.tsx:63-84`. There is also no
// corridor POLYGON to clip against: `corridorTaper.taperedCorridor()` returns
// centreline polylines with a width, and the corridor is painted as a STROKE
// over the field, never as a filled shape. So the ground is a scatter of
// individual `<image>` marks positioned against the centreline — the same idiom
// the clue marks already use, and the reason `scripts/art/build_art.py` cuts
// the two authored tiles into eight separate marks each.
//
// Pure and DOM-free, like `corridorTaper`: this repo's vitest environment is
// `node` and every surface test runs through `renderToString`, so there is no
// `getPointAtLength` and no `document` to measure against. Everything below is
// arithmetic on the polyline the level engine already built.
//
// DETERMINISTIC on purpose, via a seeded PRNG rather than `Math.random`. Two
// reasons, both load-bearing: the scatter is unit-testable only if the same
// input gives the same marks, and a field that reshuffled itself on every
// render would make the ground CRAWL under the child's finger.
import type { Point } from '../letters/types'

/** One placed piece of ground art. Origin-centred, exactly like
 * `TraceClueMark`, so the renderer's transform stays pure placement. */
export interface ScatterMark {
  x: number
  y: number
  /** Index into the caller's art array. */
  art: number
  /** Rendered height in viewBox units. */
  size: number
  /** Degrees. */
  angle: number
}

export interface ScatterInput {
  polyline: readonly Point[]
  /** Corridor width at arc fraction t, so a tapered corridor is respected. */
  halfWidthAt: (t: number) => number
  viewBox: { x: number; y: number; width: number; height: number }
  artCount: number
  /** Seeds the PRNG. Caller-supplied so two layers over the same route can be
   * decorrelated, and so a level's ground is the same ground every time. */
  seed: number
}

/** Grass lattice pitch, in viewBox units. */
const GRASS_STEP = 76
/** How far a tuft may wander off its lattice node. Below the step, so the
 * lattice never shows through as rows, but not so far that tufts pile up. */
const GRASS_JITTER = 26
/** Clearance kept between a tuft and the corridor edge. Grass does not grow on
 * a walked path — that contrast is the ONLY thing telling the child where the
 * path is, now that both sides are textured rather than grey-vs-white. */
const GRASS_CLEARANCE = 26
const GRASS_SIZE_MIN = 30
const GRASS_SIZE_MAX = 52
/** Tufts lean, they do not spin: a rotated-by-90° tuft reads as debris. */
const GRASS_TILT = 7

/** Arc-length pitch between mud clumps, one clump per step. */
const MUD_STEP = 96
/** How far off the centreline a clump may sit, as a fraction of the local half
 * width. Under 1 by a clear margin so the trail stays INSIDE the corridor even
 * where a taper has pinched it. */
const MUD_SPREAD = 0.62
/** Clue marks render at 28 units (`LevelPlay`'s `CLUE_MARK_SIZE`). Mud caps at
 * 26 and starts at 13, so every clump is SMALLER than every clue mark. That
 * ordering is the point: the ground is where the child walks, the clue is what
 * they came for, and the first render of this got it backwards — a gravel bed
 * at clue size buried the marks it was supposed to sit under. */
const MUD_SIZE_MIN = 13
const MUD_SIZE_MAX = 26

/**
 * mulberry32. Chosen because it is nine lines with no state beyond one uint32,
 * which is the entire requirement here — the scatter needs REPEATABILITY, not
 * statistical quality.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Cumulative arc length at each vertex, plus the total. */
function arcTable(points: readonly Point[]): { cum: number[]; total: number } {
  const cum = [0]
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    cum.push(total)
  }
  return { cum, total }
}

/**
 * Distance from `p` to the polyline, and the arc FRACTION of the nearest point
 * on it. The fraction is what lets `halfWidthAt` answer "how wide is the
 * corridor here" for an arbitrary point that is not on the route at all.
 */
function nearestOnPolyline(
  points: readonly Point[],
  cum: readonly number[],
  total: number,
  p: Point,
): { distance: number; t: number } {
  let best = Infinity
  let bestArc = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    // A repeated vertex has no direction; measuring to the point itself is
    // still correct, and skipping it would be wrong on a degenerate route.
    const u = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
    const qx = a.x + dx * u
    const qy = a.y + dy * u
    const d = Math.hypot(p.x - qx, p.y - qy)
    if (d < best) {
      best = d
      bestArc = cum[i - 1] + Math.sqrt(len2) * u
    }
  }
  return { distance: best, t: total > 0 ? bestArc / total : 0 }
}

/** The point at arc length `s`, with the unit tangent there. */
function sampleAt(
  points: readonly Point[],
  cum: readonly number[],
  s: number,
): { point: Point; tx: number; ty: number } {
  let i = 1
  while (i < cum.length - 1 && cum[i] < s) i++
  const a = points[i - 1]
  const b = points[i]
  const seg = cum[i] - cum[i - 1]
  const u = seg > 0 ? (s - cum[i - 1]) / seg : 0
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return {
    point: { x: a.x + dx * u, y: a.y + dy * u },
    tx: dx / len,
    ty: dy / len,
  }
}

function usable(input: ScatterInput): boolean {
  return input.polyline.length >= 2 && input.artCount > 0
}

/**
 * Grass over the whole viewBox, MINUS the corridor and a clearance band around
 * it. A jittered lattice rather than free random placement: pure random
 * scatter clumps and leaves bald patches at this density, and both read as a
 * mistake rather than as a field.
 */
export function grassScatter(input: ScatterInput): readonly ScatterMark[] {
  if (!usable(input)) return []
  const { polyline, halfWidthAt, viewBox, artCount } = input
  const { cum, total } = arcTable(polyline)
  const rand = mulberry32(input.seed)
  const out: ScatterMark[] = []
  // The lattice runs ONE FULL STEP BEYOND the viewBox on every side, and it is
  // deliberately not clipped to it. A `preserveAspectRatio="xMidYMid meet"` fit
  // letterboxes the viewBox inside a wider element, but SVG clips to the
  // VIEWPORT, not to the viewBox — so marks past the viewBox edge paint into
  // those bars and the world visibly continues past the sheet instead of
  // stopping at a seam. The first render of this started half a step INSIDE the
  // left edge and overshot only on the right, which left one bar bare and the
  // other grassed; the asymmetry was the only thing making the sheet's own
  // boundary findable.
  const x0 = viewBox.x - GRASS_STEP
  const y0 = viewBox.y - GRASS_STEP
  for (let gx = x0; gx <= viewBox.x + viewBox.width + GRASS_STEP; gx += GRASS_STEP) {
    for (let gy = y0; gy <= viewBox.y + viewBox.height + GRASS_STEP; gy += GRASS_STEP) {
      const x = gx + (rand() * 2 - 1) * GRASS_JITTER
      const y = gy + (rand() * 2 - 1) * GRASS_JITTER
      const art = Math.min(artCount - 1, Math.floor(rand() * artCount))
      const size = GRASS_SIZE_MIN + rand() * (GRASS_SIZE_MAX - GRASS_SIZE_MIN)
      const angle = (rand() * 2 - 1) * GRASS_TILT
      const near = nearestOnPolyline(polyline, cum, total, { x, y })
      // Every random draw above happens BEFORE this rejection on purpose: the
      // PRNG then advances by a fixed amount per lattice node, so moving the
      // corridor changes WHICH tufts survive without reshuffling the rest.
      if (near.distance < halfWidthAt(near.t) + GRASS_CLEARANCE) continue
      out.push({ x, y, art, size, angle })
    }
  }
  return out
}

/**
 * Mud along the route: one clump per `MUD_STEP` of arc, pushed off the
 * centreline by up to `MUD_SPREAD` of the LOCAL half width. Scaling the offset
 * by the local width is what makes a tapered corridor keep its trail inside
 * itself instead of spilling over the edge where the channel pinches.
 *
 * Full 0–360° rotation here, unlike grass: a trodden clump has no up.
 */
export function mudScatter(input: ScatterInput): readonly ScatterMark[] {
  if (!usable(input)) return []
  const { polyline, halfWidthAt, artCount } = input
  const { cum, total } = arcTable(polyline)
  if (total <= 0) return []
  const rand = mulberry32(input.seed)
  const out: ScatterMark[] = []
  for (let s = MUD_STEP / 2; s < total; s += MUD_STEP) {
    const t = s / total
    const { point, tx, ty } = sampleAt(polyline, cum, s)
    const offset = (rand() * 2 - 1) * MUD_SPREAD * halfWidthAt(t)
    out.push({
      // The perpendicular of (tx,ty) is (-ty,tx).
      x: point.x - ty * offset,
      y: point.y + tx * offset,
      art: Math.min(artCount - 1, Math.floor(rand() * artCount)),
      size: MUD_SIZE_MIN + rand() * (MUD_SIZE_MAX - MUD_SIZE_MIN),
      angle: rand() * 360,
    })
  }
  return out
}
