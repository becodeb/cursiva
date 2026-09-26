// The spine fold (`radial-spines` capability, design.md §1): a routeless
// level scored PER STROKE — the child draws individual loose straight
// strokes that leave a hedgehog's silhouette and become its spines, instead
// of following a corridor or inventing a continuous trail (`docs/13` §8 row
// H). Pure, no React, no DOM — `levels/waypoints.ts`'s own header states the
// same convention as mandatory: this repo's test harness is node with no
// jsdom and no testing-library, so a decision made only inside a pointer
// handler is invisible to every test that can exist.
//
// The architectural claim (design.md §1, tightening `waypoints.ts:141-151`):
// THE LIVE FOLD NEVER FEEDS THE SCORE. `spineScore` is recomputed purely
// from the settled stroke list, so the lit anchor and the score cannot
// disagree by construction. `spineAim`'s live half carries `aiming` only —
// render state, never scored.
//
// Anchors are DERIVED from a build-time-measured silhouette
// (`detective/assets.ts`'s `HEDGEHOG_SILHOUETTE`), never hand-authored
// coordinates (design.md §2 D2) — the same generator the body `<image>`'s
// own box comes from, so the art and the scored geometry cannot drift apart
// (paso E's failure class).
import type { Point } from '../letters/types'
import { placeArt, type ArtBox } from '../canvas/placeArt'
import { HEDGEHOG_ART, HEDGEHOG_SILHOUETTE, type HedgehogSilhouette } from '../detective/assets'

export type HedgehogPose = 'profile' | 'curled'

/** One pose's measured silhouette — restated here as a type alias onto
 *  `detective/assets.ts`'s own `HedgehogSilhouette`, so a caller can name
 *  it either way. */
export type SilhouetteProfile = HedgehogSilhouette

export interface SpineConfig {
  readonly pose: HedgehogPose
  /** Where the body's CENTROID sits on the sheet, and how tall the picture
   *  is. The box is derived (`spineBody`), never authored, so the art and
   *  the scored anchors cannot drift apart. */
  readonly body: { readonly centre: Point; readonly height: number }
  /** The spine-bearing arc, degrees, SVG convention. `to` may exceed 360 to
   *  express a wrap (the profile's back runs 200 → 400). */
  readonly arc: { readonly from: number; readonly to: number }
  readonly count: number
  readonly rules: SpineRules
}

export interface SpineRules {
  readonly baseRadius: number // measure 1, viewBox units
  readonly tolDeg: number // measure 2
  readonly straightness: number // measure 3, in (0, 1]
  readonly lenMin: number // measure 4, CHORD
  readonly lenMax: number
}

export interface SpineAnchor {
  readonly x: number
  readonly y: number
  /** Outward unit normal: the RAY direction, centroid → anchor. */
  readonly nx: number
  readonly ny: number
  readonly deg: number
}

export interface SpineState {
  /** Anchor indices filled by SETTLED strokes. Never written from the live
   *  buffer: `waypoints.ts:141-151`'s argument, taken one step further —
   *  here the live fold cannot even disagree with the score. */
  readonly filled: ReadonlySet<number>
  /** The anchor the CURRENT stroke is addressing, or null. Render only,
   *  never scored, never persisted. */
  readonly aiming: number | null
}

export const EMPTY_SPINES: SpineState = { filled: new Set(), aiming: null }
/** How many spines the demonstration draws (`docs/13` §5 item 2, "mínima"). */
export const DEMO_SPINES = 3
/** Mark radius AND its outward offset, viewBox units — one number, so the
 *  disc is tangent to the silhouette by construction (design.md §2 D4). 22
 *  across sits inside `docs/09` §3's 20-30 band for a mark. */
export const SPINE_MARK_R = 11
/** Body-crossing sample step (measure 5). At the ~30 Hz `onFrame` throttle,
 *  consecutive samples are tens of units apart, so the SEGMENT is
 *  subdivided — `trailPasses`'s own argument, restated. */
const BODY_STEP = 8

/** Linear interpolation of the measured radius table at an arbitrary
 *  degree, wrapping at 360 — `radii` is 24 equally spaced rays. */
function radiusAt(profile: SilhouetteProfile, deg: number): number {
  const n = profile.radii.length
  const step = 360 / n
  let d = deg % 360
  if (d < 0) d += 360
  const i0 = Math.floor(d / step) % n
  const i1 = (i0 + 1) % n
  const t = (d - i0 * step) / step
  return profile.radii[i0] + (profile.radii[i1] - profile.radii[i0]) * t
}

/**
 * The body's `<image>` box. Calls the shipped `placeArt` with the measured
 * centroid as the grip, so the layer and the scorer run the IDENTICAL
 * arithmetic (design.md §3.4): `centre = cfg.body.centre`, by definition of
 * the grip.
 */
export function spineBody(cfg: SpineConfig): { href: string; box: ArtBox } {
  const art = HEDGEHOG_ART[cfg.pose]
  const { centroid } = HEDGEHOG_SILHOUETTE[cfg.pose]
  const box = placeArt({ w: art.w, h: art.h, grip: centroid }, cfg.body.height, cfg.body.centre)
  return { href: art.href, box }
}

/** The uniform scale the body box was placed at — `box.width / art.w`,
 *  derived from the SAME box `spineBody` returns, so a caller can never
 *  read a different scale than what actually rendered. */
function bodyScale(cfg: SpineConfig): number {
  const art = HEDGEHOG_ART[cfg.pose]
  return spineBody(cfg).box.width / art.w
}

/**
 * Midpoint sampling, so no anchor ever lands on an excluded endpoint and the
 * set is symmetric in the arc (design.md §3.4):
 *
 *   deg_i = arc.from + (arc.to − arc.from) · (i + 0.5) / count
 *   r_i   = radiusAt(profile, deg_i) · art.w · scale
 *   A_i   = C + (cos deg_i, sin deg_i) · r_i
 *   n̂_i   = (cos deg_i, sin deg_i)
 *
 * Deterministic: the same `cfg` always yields byte-identical anchors.
 */
export function spineAnchors(cfg: SpineConfig): readonly SpineAnchor[] {
  const art = HEDGEHOG_ART[cfg.pose]
  const profile = HEDGEHOG_SILHOUETTE[cfg.pose]
  const scale = bodyScale(cfg)
  const { centre } = cfg.body
  const { from, to } = cfg.arc
  const span = to - from
  const anchors: SpineAnchor[] = []
  for (let i = 0; i < cfg.count; i++) {
    const deg = from + (span * (i + 0.5)) / cfg.count
    const rad = (deg * Math.PI) / 180
    const nx = Math.cos(rad)
    const ny = Math.sin(rad)
    const r = radiusAt(profile, deg) * art.w * scale
    anchors.push({ x: centre.x + nx * r, y: centre.y + ny * r, nx, ny, deg })
  }
  return anchors
}

/** The level's start point — derived from the same generator the scorer and
 *  the layer read, so there is no second literal to drift (design.md §4). */
export function spineOrigin(cfg: SpineConfig): Point {
  const anchors = spineAnchors(cfg)
  return { x: anchors[0].x, y: anchors[0].y }
}

/** Distance from `p` to anchor `a`. */
function dist(p: Point, a: { x: number; y: number }): number {
  return Math.hypot(p.x - a.x, p.y - a.y)
}

/**
 * Measure 1: the nearest anchor to `p0` that is NOT in `filled`, among those
 * within `baseRadius`. Ties go to the LOWEST index — iterating ascending and
 * requiring a STRICT improvement keeps the first (lowest-index) winner on an
 * exact tie. `null` when no unfilled anchor is within radius (including the
 * case where every anchor within radius is already filled — it is never
 * reassigned).
 */
function nearestUnfilledAnchor(
  anchors: readonly SpineAnchor[],
  filled: ReadonlySet<number>,
  p0: Point,
  baseRadius: number,
): number | null {
  let best = -1
  let bestDist = Infinity
  for (let i = 0; i < anchors.length; i++) {
    if (filled.has(i)) continue
    const d = dist(p0, anchors[i])
    if (d <= baseRadius && d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best === -1 ? null : best
}

/** Total arc length of a polyline. */
function arclength(points: readonly Point[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return len
}

/** Angle in degrees between two vectors, clamped against float noise at the
 *  ±1 boundary. A zero-length vector (no direction at all) fails tolerance. */
function angleBetweenDeg(ax: number, ay: number, bx: number, by: number): number {
  const magA = Math.hypot(ax, ay)
  const magB = Math.hypot(bx, by)
  if (magA === 0 || magB === 0) return 180
  const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (magA * magB)))
  return (Math.acos(cos) * 180) / Math.PI
}

/**
 * Measure 5: no sample of `S`, except those within `baseRadius` of its own
 * assigned anchor, lies inside `r(θ)` of the centroid — the geometric form
 * of the derived undrawability (design.md §2 D1(b)). Each consecutive pair
 * of points is subdivided at `BODY_STEP`, so a fast frame-rate-thin stroke
 * cannot skip over the body between two distant samples.
 */
function crossesBody(stroke: readonly Point[], anchor: SpineAnchor, cfg: SpineConfig): boolean {
  const art = HEDGEHOG_ART[cfg.pose]
  const profile = HEDGEHOG_SILHOUETTE[cfg.pose]
  const scale = bodyScale(cfg)
  const { centre } = cfg.body
  const { baseRadius } = cfg.rules

  const test = (p: Point): boolean => {
    const dx = p.x - centre.x
    const dy = p.y - centre.y
    const distC = Math.hypot(dx, dy)
    const distA = dist(p, anchor)
    if (distA <= baseRadius) return false // within its own anchor's tolerance — allowed
    let theta = (Math.atan2(dy, dx) * 180) / Math.PI
    if (theta < 0) theta += 360
    const r = radiusAt(profile, theta) * art.w * scale
    return distC < r
  }

  for (let i = 0; i < stroke.length; i++) {
    if (test(stroke[i])) return true
    if (i < stroke.length - 1) {
      const a = stroke[i]
      const b = stroke[i + 1]
      const segLen = Math.hypot(b.x - a.x, b.y - a.y)
      const steps = Math.max(1, Math.ceil(segLen / BODY_STEP))
      for (let s = 1; s < steps; s++) {
        const t = s / steps
        if (test({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return true
      }
    }
  }
  return false
}

/**
 * Measures 2-5 jointly, against the anchor measure 1 already selected. All
 * four must hold for the anchor to fill — no partial credit.
 *
 * `reversed` (T3, 2026-09-25 tablet playtest): true when measure 1 matched
 * the anchor against the stroke's LAST point rather than its first — the
 * child drew tip→base instead of base→tip. Nothing about which end the
 * finger touched down on is part of what a spine IS, and catching it here
 * is cheap: measures 3-5 (straightness, length, body-crossing) read chord
 * MAGNITUDE and per-point distances, both direction-agnostic already; only
 * measure 2's chord VECTOR needs to be reoriented before it is compared to
 * the anchor's outward normal.
 */
function passesRemainingMeasures(
  stroke: readonly Point[],
  anchor: SpineAnchor,
  cfg: SpineConfig,
  reversed: boolean,
): boolean {
  if (stroke.length < 2) return false
  const p0 = stroke[0]
  const pEnd = stroke[stroke.length - 1]
  const dx = reversed ? p0.x - pEnd.x : pEnd.x - p0.x
  const dy = reversed ? p0.y - pEnd.y : pEnd.y - p0.y
  const chord = Math.hypot(dx, dy)

  // Measure 2 — outward direction within tolDeg of the anchor's own normal.
  if (angleBetweenDeg(dx, dy, anchor.nx, anchor.ny) > cfg.rules.tolDeg) return false

  // Measure 3 — straightness, chord/arclength.
  const arc = arclength(stroke)
  if (arc <= 0 || chord / arc < cfg.rules.straightness) return false

  // Measure 4 — chord length inside the authored band.
  if (chord < cfg.rules.lenMin || chord > cfg.rules.lenMax) return false

  // Measure 5 — no body crossing beyond the anchor's own base radius.
  if (crossesBody(stroke, anchor, cfg)) return false

  return true
}

/**
 * The settled fold: greedy nearest-unfilled assignment in stroke (settlement)
 * order, all five measures per design.md §3.4's table. Monotone — `filled`
 * only ever grows — and returns the SAME REFERENCE when no stroke in this
 * call fills a new anchor.
 *
 * Measure 1's `baseRadius` (T3, 2026-09-25 tablet playtest — "a well-drawn
 * spine is rejected when it does not start exactly on the small start
 * dot"): every `cfg.rules.baseRadius` this repo ships is now sized with a
 * six-year-old's tablet fingertip in mind, not a stylus — see
 * `levels/catalog.ts`'s hedgehog-family comment for the exact numbers and
 * the geometric ceiling (`2·baseRadius ≤` the nearest two anchors' own
 * chord) that bounds how generous it can ever be.
 *
 * A stroke may also be drawn REVERSED (tip→base): if the FIRST point is not
 * within radius of any unfilled anchor, the LAST point is tried instead,
 * and `passesRemainingMeasures` is told so it reorients the chord the same
 * way a forward stroke's own p0→pEnd already reads. Forward is tried first
 * and wins ties, since it is how most strokes are actually drawn.
 */
export function spineSettle(
  prev: SpineState,
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  cfg: SpineConfig,
): SpineState {
  const anchors = spineAnchors(cfg)
  let filled = prev.filled
  let changed = false
  for (const stroke of strokes) {
    if (stroke.length === 0) continue
    let idx = nearestUnfilledAnchor(anchors, filled, stroke[0], cfg.rules.baseRadius)
    let reversed = false
    if (idx === null && stroke.length > 1) {
      idx = nearestUnfilledAnchor(anchors, filled, stroke[stroke.length - 1], cfg.rules.baseRadius)
      reversed = idx !== null
    }
    if (idx === null) continue
    if (!passesRemainingMeasures(stroke, anchors[idx], cfg, reversed)) continue
    const next = new Set(filled)
    next.add(idx)
    filled = next
    changed = true
  }
  if (!changed) return prev
  return { filled, aiming: prev.aiming }
}

/**
 * The accuracy pillar: `round(100 · filled.size / anchors.length)`, purely
 * from the complete settled stroke list at evaluation time — never from the
 * live fold (`spineAim`'s state is never read here).
 */
export function spineScore(strokes: ReadonlyArray<ReadonlyArray<Point>>, cfg: SpineConfig): number {
  const anchors = spineAnchors(cfg)
  const settled = spineSettle(EMPTY_SPINES, strokes, cfg)
  return Math.round((100 * settled.filled.size) / anchors.length)
}

/**
 * T13 (`odd/tasks/prewriting-stage-completion.md`, tablet playtest #2: "a
 * line that isn't a spine could disappear when I lift the finger"): which
 * INDICES of `strokes` actually earned an anchor — the same information
 * `spineSettle`'s own `filled` set carries, restated per-STROKE rather than
 * per-anchor, so a render layer can show only the strokes that are real
 * spines and let every other one fade away instead of sitting on the sheet
 * forever as unexplained scribble.
 *
 * Deliberately a SEPARATE small walk rather than a `spineSettle` return-shape
 * change: `spineSettle` folds INCREMENTALLY against a caller-supplied `prev`
 * and returns the SAME reference when nothing new fills (a contract several
 * callers/tests already depend on); this always folds fresh from EMPTY,
 * `spineScore`'s own convention (the live fold never feeds either). Both
 * still call the exact same measure functions — `nearestUnfilledAnchor` and
 * `passesRemainingMeasures`, this file's one place measures 1-5 are decided —
 * so what counts as a spine cannot drift between the two callers; only the
 * bookkeeping loop (which needs the stroke's own index, `spineSettle` never
 * does) is restated.
 */
export function acceptedSpineStrokeIndices(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  cfg: SpineConfig,
): ReadonlySet<number> {
  const anchors = spineAnchors(cfg)
  const filled = new Set<number>()
  const accepted = new Set<number>()
  for (let i = 0; i < strokes.length; i++) {
    const stroke = strokes[i]
    if (stroke.length === 0) continue
    let idx = nearestUnfilledAnchor(anchors, filled, stroke[0], cfg.rules.baseRadius)
    let reversed = false
    if (idx === null && stroke.length > 1) {
      idx = nearestUnfilledAnchor(anchors, filled, stroke[stroke.length - 1], cfg.rules.baseRadius)
      reversed = idx !== null
    }
    if (idx === null) continue
    if (!passesRemainingMeasures(stroke, anchors[idx], cfg, reversed)) continue
    filled.add(idx)
    accepted.add(i)
  }
  return accepted
}

/**
 * The live fold: `aiming` only, never scoreable. The nearest unfilled anchor
 * to the CURRENT stroke's base, or `null` while not drawing / out of every
 * anchor's radius. Returns the SAME REFERENCE when nothing flips.
 *
 * Mirrors `spineSettle`'s own reverse-stroke fallback (T3): while the child
 * is still mid-stroke drawing tip→base, the live highlight should already
 * point at the anchor the release will credit, rather than sitting dark
 * until lift only to jump to "filled" with no live feedback in between.
 */
export function spineAim(
  prev: SpineState,
  points: readonly Point[],
  drawing: boolean,
  cfg: SpineConfig,
): SpineState {
  if (!drawing || points.length === 0) {
    if (prev.aiming === null) return prev
    return { filled: prev.filled, aiming: null }
  }
  const anchors = spineAnchors(cfg)
  let idx = nearestUnfilledAnchor(anchors, prev.filled, points[0], cfg.rules.baseRadius)
  if (idx === null && points.length > 1) {
    idx = nearestUnfilledAnchor(anchors, prev.filled, points[points.length - 1], cfg.rules.baseRadius)
  }
  if (idx === prev.aiming) return prev
  return { filled: prev.filled, aiming: idx }
}

/** One render-ready anchor mark. Structural on purpose so this module
 *  imports nothing from `canvas/` — `waypoints.ts`'s `WaypointRender`'s own
 *  convention. */
export interface SpineMark {
  readonly x: number
  readonly y: number
  readonly filled: boolean
  /** True for exactly the lowest-index unfilled anchor (T3, "isn't
   *  intuitive" — a level with no live indication of what to draw next).
   *  Render-only, mutually exclusive with `filled` by construction: see
   *  {@link nextSpineIndex}. */
  readonly next: boolean
}

/**
 * The lowest-index anchor not yet filled — "where to draw next". Anchor
 * order is the SAME generator order `spineAnchors` always returns (also the
 * order the demonstration and `?debug=espinas:<k>` fill in), so "lowest
 * index" reads as the natural next step rather than an arbitrary pick.
 * `null` once every anchor is filled — nothing left to point at.
 */
export function nextSpineIndex(cfg: SpineConfig, state: SpineState): number | null {
  const anchors = spineAnchors(cfg)
  for (let i = 0; i < anchors.length; i++) {
    if (!state.filled.has(i)) return i
  }
  return null
}

/**
 * Every anchor's render-ready mark. Centre is `A_i + SPINE_MARK_R · n̂_i`
 * (design.md §2 D4's tangency resolution): pushed OUTWARD along its own ray
 * by exactly its own radius, so the disc is tangent to the silhouette and
 * lies entirely on the night band rather than half over the body.
 */
export function spineMarks(cfg: SpineConfig, state: SpineState): readonly SpineMark[] {
  const hint = nextSpineIndex(cfg, state)
  return spineAnchors(cfg).map((a, i) => ({
    x: a.x + SPINE_MARK_R * a.nx,
    y: a.y + SPINE_MARK_R * a.ny,
    filled: state.filled.has(i),
    next: i === hint,
  }))
}

/** One debug ring per anchor at `baseRadius` — `?debug=espinas:<k>` only. */
export function spineRings(cfg: SpineConfig): readonly { x: number; y: number; radius: number }[] {
  return spineAnchors(cfg).map((a) => ({ x: a.x, y: a.y, radius: cfg.rules.baseRadius }))
}

/**
 * The ONE anchor→tip computation. Both renderings of "the first `k` spines"
 * — the demonstration's SVG `d` strings and `?debug=espinas:<k>`'s ink —
 * are projections of this list, so they cannot drift apart: two functions
 * independently deciding where a tip sits is exactly how a still frame ends
 * up telling two stories at once (`docs/13` §4 amendment 8, the bee's own
 * lesson).
 *
 * The tip sits at the length band's own midpoint outward along the anchor's
 * normal — a plausible spine, neither the shortest nor the longest
 * admissible stroke. `Math.trunc` makes the clamp literally the one
 * `debugSpines` uses, so the same `k` can never fill a different number of
 * anchors than it draws strokes for; it is a no-op on the integer `k` every
 * caller passes, so `spineDemoPaths` below is unchanged.
 */
function spineSegments(cfg: SpineConfig, k: number): readonly (readonly [Point, Point])[] {
  const anchors = spineAnchors(cfg)
  const n = Math.max(0, Math.min(Math.trunc(k), anchors.length))
  const len = (cfg.rules.lenMin + cfg.rules.lenMax) / 2
  const segments: (readonly [Point, Point])[] = []
  for (let i = 0; i < n; i++) {
    const a = anchors[i]
    segments.push([
      { x: a.x, y: a.y },
      { x: a.x + a.nx * len, y: a.y + a.ny * len },
    ])
  }
  return segments
}

/**
 * The demonstration's own source (the demo repair, design.md §2 D3): the
 * first `k` anchor→tip line segments, one per anchor in generator order, as
 * SVG path `d` strings (the same shape `LevelTarget.paths` already is).
 */
export function spineDemoPaths(cfg: SpineConfig, k: number): readonly string[] {
  return spineSegments(cfg, k).map(([base, tip]) => `M ${base.x} ${base.y} L ${tip.x} ${tip.y}`)
}

/**
 * The ink `?debug=espinas:<k>` paints: the first `k` anchor→tip strokes, one
 * two-point list per spine, in the SAME generator order `debugSpines` fills.
 * Each spine is its own stroke — the child draws k separate loose strokes,
 * never one polyline — so this returns k lists, not one.
 *
 * Render-only: never scored, never persisted. Derived from `spineSegments`
 * alongside `spineDemoPaths`, so the demonstration and the debug frame can
 * never show the spine in two different places.
 */
export function debugSpineStrokes(cfg: SpineConfig, k: number): readonly (readonly Point[])[] {
  return spineSegments(cfg, k).map(([base, tip]) => [base, tip])
}

/** `?debug=espinas:<k>` — the first `k` anchors (by generator order) already
 *  filled, the rest unfilled. Ungated: it paints render state only, adds no
 *  control, persists nothing, and must work against the exact build being
 *  screenshotted. */
export function debugSpines(cfg: SpineConfig, k: number): SpineState {
  const anchors = spineAnchors(cfg)
  const n = Math.max(0, Math.min(anchors.length, Math.trunc(k)))
  const filled = new Set<number>()
  for (let i = 0; i < n; i++) filled.add(i)
  return { filled, aiming: null }
}

/** `initialArrange`/`seedArrange`'s own convention (`levels/arrange.ts`): the
 *  ONE function every reset site must call, so a screenshot-seeding debug
 *  count is never silently wiped by a later reset calling `EMPTY_SPINES`
 *  directly. */
export function seedSpines(cfg: SpineConfig, debugCount: number | null): SpineState {
  return debugCount !== null ? debugSpines(cfg, debugCount) : EMPTY_SPINES
}
