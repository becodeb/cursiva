// Pipeline that ingests hand-drawn single-stroke SVGs (Figma pen tool) and turns
// them into full LetterConfig objects — no manual checkpoint / ideal-cloud /
// animation authoring. All functions are pure (no DOM) so they run under vitest
// in node, and the glob-based loader runs at Vite transform time.
import { resample } from '../canvas/resample'
import { SECONDARY_STROKE_CHARS, exitKindFor } from './anchors'
import type { BaselineZone, LetterCheckpoint, LetterConfig, Point } from './types'

/** Clamp `v` into the inclusive range [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ─────────────────────────────────────────────────────────────────────────────
// Ruled-line geometry (viewBox 0 0 1000 600, Y grows downward)
// ─────────────────────────────────────────────────────────────────────────────
// Distances from the baseline: 120px up to the middle line, 240px up to the top
// line, 120px down to the descender line.
export const TOP_LINE_Y = 180 // top ruled line (ascenders)
export const MIDDLE_LINE_Y = 300 // imaginary middle line (x-height / top of a,c,o)
export const BASELINE_Y = 420 // baseline (where letters rest)
export const DESCENDER_LINE_Y = 540 // below baseline (descenders)

/**
 * Per-letter zone map. Drives the automatic normalization of a hand-drawn SVG
 * onto the ruled line so the stroke bottom rests on the baseline and the top on
 * the appropriate line for the letter's height class.
 */
const MEDIA_CHARS = 'aceimnorsuvwxz' // body between MIDDLE_LINE and BASELINE
const ALTA_CHARS = 'bdhklt' // ascenders: between TOP_LINE and BASELINE (t per Zaner-Bloser)
const BAJA_CHARS = 'gpqy' // descenders: between MIDDLE_LINE and DESCENDER (approx)
// 'f' and 'j' → 'mixta' (ascender + descender: between TOP_LINE and DESCENDER).
// The school-cursive f spans the ascender AND descends below the baseline.

const ZONE_GROUPS: ReadonlyArray<{ chars: string; zone: BaselineZone }> = [
  { chars: MEDIA_CHARS, zone: 'media' },
  { chars: ALTA_CHARS, zone: 'alta' },
  { chars: BAJA_CHARS, zone: 'baja' },
  { chars: 'fj', zone: 'mixta' },
]

export const LETTER_ZONES: Record<string, BaselineZone> = Object.fromEntries(
  ZONE_GROUPS.flatMap(({ chars, zone }) => [...chars].map((c) => [c, zone] as const)),
)

/** Resolve the ruled zone for a character (default 'media' for unknowns/uppercase). */
export function resolveBaselineZone(char: string): BaselineZone {
  return LETTER_ZONES[char.toLowerCase()] ?? 'media'
}

/**
 * Total arc length of a polyline (sum of chord distances between consecutive
 * points). Drives the uniform-in-arc-length checkpoint spacing — NOT uniform in
 * time or in point index.
 */
export function polylineLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return total
}

/**
 * Point on `points` (a polyline) at exactly `target` arc length from the start,
 * found by linear interpolation along the polyline. `target` is clamped to the
 * polyline's extremes, so an out-of-range fraction yields the nearest endpoint
 * instead of throwing.
 */
export function pointAtArcLength(points: Point[], target: number): Point {
  if (points.length === 0) throw new Error('pointAtArcLength: empty polyline')
  if (points.length === 1 || target <= 0) return { x: points[0].x, y: points[0].y }
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (acc + segLen >= target || i === points.length - 1) {
      const t = segLen === 0 ? 0 : (target - acc) / segLen
      const clampedT = Math.max(0, Math.min(1, t))
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * clampedT,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * clampedT,
      }
    }
    acc += segLen
  }
  return { x: points[points.length - 1].x, y: points[points.length - 1].y }
}

/**
 * Extract the `d` attribute of the FIRST `<path>` element in an SVG string.
 * Tolerant of attributes before/after `d`, single or double quotes, optional
 * whitespace around `=`, and nested `<g>` / `<svg>` wrappers (only the first
 * `<path>` wins). Returns null when no `<path>` is present.
 */
export function extractPathD(svg: string): string | null {
  const match = svg.match(/<path\b[^>]*\bd\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/i)
  if (!match) return null
  const d = match[2] ?? match[3]
  return d && d.length > 0 ? d : null
}

/**
 * Tokenize an SVG path `d` into command-letter / number tokens. Glues like
 * `M95 1.28` are split correctly because every command letter (the full
 * `MLHVCSQTAZ` alphabet, upper or lower case) is wrapped in spaces before
 * splitting. Whitespace and commas between numbers are separators. Widened to
 * the full alphabet so every command reaches `setCmd` — including `S`/`T`,
 * which `setCmd` rejects by name instead of being silently mis-tokenized as
 * numeric data.
 */
function tokenizePathD(d: string): string[] {
  return d
    .replace(/([MmLlHhVvCcSsQqTtAaZz])/g, ' $1 ')
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
}

/** True when `tok` is a path command letter (case-insensitive, full alphabet). */
function isCmd(tok: string): boolean {
  return /^[MmLlHhVvCcSsQqTtAaZz]$/.test(tok)
}

/**
 * Sample the cubic Bézier P0→P3 (controls C1, C2) into 48 uniform steps and
 * push them onto `points` (P0 itself is NOT pushed — it is implicit as the
 * previous point already in the array, matching every other segment kind).
 * Shared by the `C` command and by {@link emitArc}'s arc→cubic conversion.
 */
function emitCubic(points: Point[], p0: Point, c1: Point, c2: Point, p3: Point): void {
  const STEPS = 48
  for (let s = 1; s <= STEPS; s++) {
    const t = s / STEPS
    const mt = 1 - t
    points.push({
      x: mt ** 3 * p0.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * p3.x,
      y: mt ** 3 * p0.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * p3.y,
    })
  }
}

/**
 * Elliptical arc `A`/`a` → cubic Béziers, SVG 2 §B.2.4 endpoint-to-center
 * parameterization: radii are corrected when `Λ > 1` (Step 2 of the spec
 * algorithm); `rx === 0 || ry === 0` degrades to a straight line (a
 * zero-radius arc has no ellipse to trace); coincident endpoints are a no-op
 * (SVG spec: an arc whose endpoints are identical draws nothing). The swept
 * angle `Δθ` is split into `ceil(|Δθ| / (π/2))` cubic segments, each with
 * `k = (4/3)·tan(Δθᵢ/4)` control-arm length, fed to {@link emitCubic} — the
 * SAME sampler the `C` command uses, so arcs and explicit cubics share one
 * flattening density.
 */
function emitArc(
  points: Point[],
  p0: Point,
  rxIn: number,
  ryIn: number,
  xAxisRotationDeg: number,
  largeArc: boolean,
  sweep: boolean,
  p1: Point,
): void {
  if (p0.x === p1.x && p0.y === p1.y) return // coincident endpoints: no-op
  if (rxIn === 0 || ryIn === 0) {
    points.push({ x: p1.x, y: p1.y }) // zero-radius: degrade to a straight line
    return
  }
  let rx = Math.abs(rxIn)
  let ry = Math.abs(ryIn)
  const phi = (xAxisRotationDeg * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)

  // Step 1 (B.2.4): (x1', y1') — start point in the rotated, midpoint-centered frame.
  const dx2 = (p0.x - p1.x) / 2
  const dy2 = (p0.y - p1.y) / 2
  const x1p = cosPhi * dx2 + sinPhi * dy2
  const y1p = -sinPhi * dx2 + cosPhi * dy2

  // Step 2: radii correction (Λ > 1 ⇒ scale both radii up uniformly).
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s
    ry *= s
  }

  // Step 3: (cx', cy') — center in the rotated, midpoint-centered frame.
  const rx2 = rx * rx
  const ry2 = ry * ry
  const x1p2 = x1p * x1p
  const y1p2 = y1p * y1p
  const sign = largeArc !== sweep ? 1 : -1
  const num = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2)
  const den = rx2 * y1p2 + ry2 * x1p2
  const co = den === 0 ? 0 : sign * Math.sqrt(num / den)
  const cxp = co * ((rx * y1p) / ry)
  const cyp = co * (-(ry * x1p) / rx)

  // Step 4: (cx, cy) — center in the original coordinate frame.
  const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2

  // Step 5: start angle θ1 and swept angle Δθ.
  const angleBetween = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy)
    const cosA = len === 0 ? 1 : Math.max(-1, Math.min(1, dot / len))
    const sign2 = ux * vy - uy * vx < 0 ? -1 : 1
    return sign2 * Math.acos(cosA)
  }
  const ux = (x1p - cxp) / rx
  const uy = (y1p - cyp) / ry
  const vx = (-x1p - cxp) / rx
  const vy = (-y1p - cyp) / ry
  const theta1 = angleBetween(1, 0, ux, uy)
  let dtheta = angleBetween(ux, uy, vx, vy)
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI

  // Step 6: split into ≤90° cubic segments and emit each via emitCubic.
  const segments = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI / 2)))
  const dThetaI = dtheta / segments
  const kFactor = (4 / 3) * Math.tan(dThetaI / 4)

  const pointAt = (theta: number): Point => ({
    x: cx + cosPhi * rx * Math.cos(theta) - sinPhi * ry * Math.sin(theta),
    y: cy + sinPhi * rx * Math.cos(theta) + cosPhi * ry * Math.sin(theta),
  })
  const derivAt = (theta: number): Point => ({
    x: -cosPhi * rx * Math.sin(theta) - sinPhi * ry * Math.cos(theta),
    y: -sinPhi * rx * Math.sin(theta) + cosPhi * ry * Math.cos(theta),
  })

  let prev = p0
  let thetaStart = theta1
  for (let seg = 0; seg < segments; seg++) {
    const thetaEnd = thetaStart + dThetaI
    const segEnd = pointAt(thetaEnd)
    const dStart = derivAt(thetaStart)
    const dEnd = derivAt(thetaEnd)
    const c1 = { x: prev.x + kFactor * dStart.x, y: prev.y + kFactor * dStart.y }
    const c2 = { x: segEnd.x - kFactor * dEnd.x, y: segEnd.y - kFactor * dEnd.y }
    emitCubic(points, prev, c1, c2, segEnd)
    prev = segEnd
    thetaStart = thetaEnd
  }
}

/**
 * Flatten an SVG path `d` (M/L/H/V/C/Q/A/Z, absolute or relative) into a
 * dense polyline. Cubic Béziers are subdivided into 48 steps (arcs too, via
 * {@link emitArc}), quadratics into 24; `L`/`M`/`H`/`V` contribute their
 * endpoints; `Z` closes back to the subpath start.
 *
 * Fail-loud contract (letter-model "Fail-Loud Unsupported Path Commands"):
 * any command outside `{M,L,H,V,Q,C,Z,A}` (incl. lowercase) throws an `Error`
 * naming the offending letter; any numeric token that parses to a non-finite
 * value (`NaN`/`Infinity`) throws an `Error` naming the offending token.
 * Neither is silently coerced into a coordinate.
 *
 * Returns:
 *  - `points`: the full polyline IN PATH ORDER (the order the SVG was drawn).
 *  - `starts`: index into `points` where EACH subpath begins. The first entry
 *    is always 0; one extra entry is pushed for every additional `M`.
 *
 * Returns `{ points: [], starts: [] }` when there is no `M` command or fewer
 * than 3 points total (degenerate / empty path).
 */
export function flattenPathD(d: string): { points: Point[]; starts: number[] } {
  if (!d.trim()) return { points: [], starts: [] }
  const tokens = tokenizePathD(d)
  const points: Point[] = []
  const starts: number[] = []
  let cx = 0
  let cy = 0
  let subStartX = 0
  let subStartY = 0

  // State machine (mirrors transformPathD) so IMPLICIT subcommands work: after
  // a C/Q/L/M, more numbers WITHOUT a repeated command letter are the next
  // segment of the SAME command (SVG spec: "the command letter is not
  // repeated"). M is special: an implicit continuation of M is an L (lineto),
  // not another moveto.
  let cmd: string | null = null
  let rel = false
  let needs = 0
  let remaining = 0

  // Coordinate buffers for the in-progress segment (raw token values; relativity
  // vs. the cursor is applied at execution time). bRx/bRy/bRot/bLarge/bSweep
  // are arc-only (`A`); bRx/bRy/bRot are NEVER relative even under `a` — only
  // the trailing x,y (bx/by) are.
  let bx = 0
  let by = 0
  let bx1 = 0
  let by1 = 0
  let bx2 = 0
  let by2 = 0
  let bRx = 0
  let bRy = 0
  let bRot = 0
  let bLarge = 0
  let bSweep = 0

  const setCmd = (letter: string): void => {
    cmd = letter.toUpperCase()
    rel = letter === letter.toLowerCase() && letter !== letter.toUpperCase()
    switch (cmd) {
      case 'M':
      case 'L':
        needs = 2
        break
      case 'H':
      case 'V':
        needs = 1
        break
      case 'C':
        needs = 6
        break
      case 'Q':
        needs = 4
        break
      case 'A':
        needs = 7
        break
      case 'Z':
        needs = 0
        break
      default:
        // Covers S/T (fail-loud contract: the tokenizer now routes every
        // command letter here, so an unsupported one is caught by NAME
        // instead of silently mis-parsed as numeric data).
        throw new Error(`flattenPathD: unsupported path command "${letter}"`)
    }
    remaining = needs
  }

  const executeSegment = (): void => {
    if (cmd === null) return
    const c = cmd
    if (c === 'M') {
      const x = bx + (rel ? cx : 0)
      const y = by + (rel ? cy : 0)
      starts.push(points.length)
      points.push({ x, y })
      cx = x
      cy = y
      subStartX = x
      subStartY = y
    } else if (c === 'L') {
      const x = bx + (rel ? cx : 0)
      const y = by + (rel ? cy : 0)
      points.push({ x, y })
      cx = x
      cy = y
    } else if (c === 'H') {
      const x = bx + (rel ? cx : 0)
      points.push({ x, y: cy })
      cx = x
    } else if (c === 'V') {
      const y = by + (rel ? cy : 0)
      points.push({ x: cx, y })
      cy = y
    } else if (c === 'C') {
      const x1 = bx1 + (rel ? cx : 0)
      const y1 = by1 + (rel ? cy : 0)
      const x2 = bx2 + (rel ? cx : 0)
      const y2 = by2 + (rel ? cy : 0)
      const x = bx + (rel ? cx : 0)
      const y = by + (rel ? cy : 0)
      emitCubic(points, { x: cx, y: cy }, { x: x1, y: y1 }, { x: x2, y: y2 }, { x, y })
      cx = x
      cy = y
    } else if (c === 'Q') {
      const x1 = bx1 + (rel ? cx : 0)
      const y1 = by1 + (rel ? cy : 0)
      const x = bx + (rel ? cx : 0)
      const y = by + (rel ? cy : 0)
      const p0 = { x: cx, y: cy }
      const STEPS = 24
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS
        const mt = 1 - t
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * x1 + t * t * x,
          y: mt * mt * p0.y + 2 * mt * t * y1 + t * t * y,
        })
      }
      cx = x
      cy = y
    } else if (c === 'A') {
      const x = bx + (rel ? cx : 0)
      const y = by + (rel ? cy : 0)
      emitArc(points, { x: cx, y: cy }, bRx, bRy, bRot, bLarge !== 0, bSweep !== 0, { x, y })
      cx = x
      cy = y
    } else if (c === 'Z') {
      points.push({ x: subStartX, y: subStartY })
      cx = subStartX
      cy = subStartY
    }
  }

  let i = 0
  while (i < tokens.length) {
    const tok = tokens[i]
    if (isCmd(tok)) {
      setCmd(tok)
      if (cmd === 'Z') executeSegment()
      i += 1
      continue
    }
    // Numeric coordinate token. Fail loud on NaN/Infinity (a malformed or
    // glued token, e.g. a flag-glued arc parameter like "1-2.75") instead of
    // propagating it into the flattened point sequence.
    const num = Number(tok)
    if (!Number.isFinite(num)) {
      throw new Error(`flattenPathD: invalid numeric token "${tok}"`)
    }
    if (remaining === 0) {
      // Either a stray leading number (no M yet), or an implicit continuation
      // of the previous command. M implicit-continues to L; every other
      // command (L/H/V/C/Q/A) repeats itself.
      if (cmd === null || cmd === 'Z') {
        i += 1
        continue
      }
      const cont = cmd === 'M' ? 'L' : cmd
      setCmd(rel ? cont.toLowerCase() : cont)
    }
    const c = cmd!
    const slot = needs - remaining
    if (c === 'M' || c === 'L') {
      if (slot === 0) bx = num
      else by = num
    } else if (c === 'H') {
      bx = num
    } else if (c === 'V') {
      by = num
    } else if (c === 'C') {
      if (slot === 0) bx1 = num
      else if (slot === 1) by1 = num
      else if (slot === 2) bx2 = num
      else if (slot === 3) by2 = num
      else if (slot === 4) bx = num
      else by = num
    } else if (c === 'Q') {
      if (slot === 0) bx1 = num
      else if (slot === 1) by1 = num
      else if (slot === 2) bx = num
      else by = num
    } else if (c === 'A') {
      if (slot === 0) bRx = num
      else if (slot === 1) bRy = num
      else if (slot === 2) bRot = num
      else if (slot === 3) bLarge = num
      else if (slot === 4) bSweep = num
      else if (slot === 5) bx = num
      else by = num
    }
    remaining -= 1
    if (remaining === 0) executeSegment()
    i += 1
  }

  if (starts.length === 0 || points.length < 3) return { points: [], starts: [] }
  return { points, starts }
}

/**
 * Classify flattened subpaths into writing order: the MAIN subpath first
 * (the one whose FIRST point is nearest the bbox bottom-left — the entry
 * anchor proxy), then every secondary subpath after it.
 *
 * The entry proxy is `(minX, maxY)` of ALL points: char-independent and
 * pre-fit, so the classification needs no anchor metadata yet. Ties break to
 * the LONGER polyline (arc length), then to file order. The result is the
 * subpath indices `[mainIdx, ...remaining]` — main first, secondaries in a
 * stable order — which `reorderForWriting` concatenates in.
 */
export function classifySubpaths(points: Point[], starts: number[]): number[] {
  if (starts.length <= 1) return starts.length === 1 ? [0] : []

  let minX = Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y > maxY) maxY = p.y
  }

  const ends: number[] = [...starts.slice(1), points.length]
  const distToEntry = (i: number): number => {
    const first = points[starts[i]]
    return Math.hypot(first.x - minX, first.y - maxY)
  }
  const arcLength = (i: number): number => {
    let total = 0
    for (let j = starts[i] + 1; j < ends[i]; j++) {
      total += Math.hypot(points[j].x - points[j - 1].x, points[j].y - points[j - 1].y)
    }
    return total
  }

  const order = starts.map((_, i) => i)
  order.sort((a, b) => {
    const da = distToEntry(a)
    const db = distToEntry(b)
    // Ties: nearest-to-entry wins; equidistant → longer polyline; then file order.
    if (Math.abs(da - db) > 1e-9) return da - db
    const la = arcLength(a)
    const lb = arcLength(b)
    if (la !== lb) return lb - la
    return a - b
  })
  return order
}

/** Result of {@link reorderForWriting}: the (possibly reordered) polyline plus
 * a gap diagnostic for multi-subpath input. */
export interface ReorderedPath {
  /** The polyline in writing order. */
  points: Point[]
  /**
   * True when the flattened path has MORE THAN ONE subpath AND there is at
   * least one jump > 15px between the last point of a subpath and the first
   * point of the next one — i.e. the subpaths do not connect node-to-node.
   * False for a single subpath (there is nothing to gap) and for multi-subpath
   * paths whose consecutive subpaths touch.
   */
  hasGaps: boolean
  /**
   * Arc length (in the ORIGINAL polyline's coordinate space) from the start of
   * the concatenated polyline to the LAST point of the MAIN subpath. Arc-length
   * resampling preserves arc positions, and `adjustToRuledZone` scales both
   * axes uniformly, so the fitted main end is
   * `pointAtArcLength(fitted, mainEndArc * fit.scaleX)`.
   */
  mainEndArc: number
}

/**
 * Put a flattened polyline into WRITING order:
 *
 *  - single subpath (`starts.length <= 1`): returned VERBATIM. The path order
 *    IS the writing order — the first node of the path is where the stroke
 *    begins and where checkpoint 1 must land. No rotation, no cut, no reversal.
 *  - multiple subpaths: classify them ({@link classifySubpaths} — main =
 *    subpath starting nearest the entry anchor, ties → longer, then file
 *    order) and concatenate main first, secondaries after. The main body is
 *    the letter; the dot / cross / second diagonal are pen-lift strokes drawn
 *    AFTER the main path ("finish the word"). Gaps between consecutive
 *    subpaths are reported (`hasGaps`) so the author knows the strokes do not
 *    connect node-to-node.
 *
 * A subpath is NEVER reversed. Reversing would flip an anticlockwise oval into
 * a clockwise one and break the pedagogical "anticlockwise turn" rule of the
 * MVP, so a single subpath is passed through unchanged.
 */
export function reorderForWriting(points: Point[], starts: number[]): ReorderedPath {
  if (points.length < 2) return { points, hasGaps: false, mainEndArc: 0 }

  const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

  // Single subpath: the author's path order IS the writing order. Return it
  // verbatim — no rotation, cut, or reversal. The first node of the path is
  // where the stroke begins and where checkpoint 1 must land. The whole path
  // is the main subpath, so mainEndArc = its total arc length.
  if (starts.length <= 1) {
    return { points, hasGaps: false, mainEndArc: polylineLength(points) }
  }

  // Multiple subpaths: split into the per-subpath slices, classify (main
  // first, secondaries after), then concatenate in that order. No greedy
  // chaining, no reversal.
  const subpaths: Point[][] = []
  for (let s = 0; s < starts.length; s++) {
    const a0 = starts[s]
    const a1 = s + 1 < starts.length ? starts[s + 1] : points.length
    subpaths.push(points.slice(a0, a1))
  }
  const order = classifySubpaths(points, starts)

  // Gap = jump between the LAST point of subpath i and the FIRST point of
  // subpath i+1, measured over the CONCATENATED (writing) order.
  let hasGaps = false
  for (let k = 0; k < order.length - 1; k++) {
    const lastOfCurrent = subpaths[order[k]][subpaths[order[k]].length - 1]
    const firstOfNext = subpaths[order[k + 1]][0]
    if (dist(lastOfCurrent, firstOfNext) > 15) hasGaps = true
  }

  const result: Point[] = []
  let mainEndArc = 0
  for (let k = 0; k < order.length; k++) {
    const sp = subpaths[order[k]]
    if (k === 0) {
      // order[0] is the MAIN subpath (nearest the entry anchor); its last
      // point sits at this arc length from the start of the concatenation.
      mainEndArc = polylineLength(sp)
    }
    for (const p of sp) result.push(p)
  }

  return { points: result, hasGaps, mainEndArc }
}

/**
 * Index into a concatenated polyline of the first point AFTER the MAIN
 * subpath: walk cumulative arc length until it reaches `mainEndArc` (the main
 * subpath's total arc length). Returns `points.length` when the main subpath
 * runs to the end (single-subpath path). The walk uses the exact same
 * per-segment sums that produced `mainEndArc`, so the boundary lands on the
 * subpath cut.
 */
function mainSpanEndIndex(points: Point[], mainEndArc: number): number {
  if (mainEndArc <= 0) return 1
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    acc += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (acc >= mainEndArc - 1e-6) return i + 1
  }
  return points.length
}

/** Build an SVG `d` polyline (`M x y L x y …`) from a list of points. */
export function pathFromPoints(points: Point[]): string {
  if (points.length === 0) return ''
  const round = (n: number): number => Math.round(n * 100) / 100
  let out = `M ${round(points[0].x)} ${round(points[0].y)}`
  for (let j = 1; j < points.length; j++) {
    out += ` L ${round(points[j].x)} ${round(points[j].y)}`
  }
  return out
}

/** Index of the first polyline vertex whose cumulative arc from the start
 * reaches `arc` (walk chords). Returns the last index when `arc` exceeds the
 * polyline's total length. */
function cutAtArc(points: Point[], arc: number): number {
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    acc += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (acc >= arc - 1e-9) return i
  }
  return points.length - 1
}

/** Index of the polyline vertex nearest `target`. */
function nearestVertexTo(points: Point[], target: Point): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < points.length; i++) {
    const d = Math.hypot(points[i].x - target.x, points[i].y - target.y)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/**
 * Split a polyline into its MAIN span and the pen-lift TAIL after it — the
 * ONE shared cut consumed by both the solo per-letter `segments` render
 * ({@link buildLetterConfig}) and the word-assembly main/tail split
 * (`combinations.ts`'s `buildWord`).
 *
 * The cut is `mainEndArc` (arc-length walk, letter-model "LetterConfig
 * Shape") when present; otherwise the vertex nearest `fallbackExit` (the
 * exit anchor sits exactly on `d` end for single-subpath letters); otherwise
 * the whole polyline is MAIN and `tail` is empty.
 */
export function splitMainTail(
  points: Point[],
  mainEndArc: number | undefined,
  fallbackExit?: Point,
): { main: Point[]; tail: Point[] } {
  const cut =
    mainEndArc !== undefined
      ? cutAtArc(points, mainEndArc)
      : fallbackExit !== undefined
        ? nearestVertexTo(points, fallbackExit)
        : points.length - 1
  return { main: points.slice(0, cut + 1), tail: points.slice(cut + 1) }
}

/**
 * Generate checkpoints UNIFORM IN ARC LENGTH (not in time, not point-density):
 * N points at fractions i/(N-1) of the path's total arc length.
 *
 *  - N = clamp(round(totalLength / 140), 4, 8)
 *  - order is strictly 1..N
 *  - radius is adaptive: clamp(round(segmentArcLength * 0.55), 35, 60), where
 *    segmentArcLength = totalLength / (N - 1). This keeps a correct stroke from
 *    "sticking" on dense curves.
 *
 * `points` is the path already sampled into a polyline (see `resample`); the
 * exact point at each arc fraction is found by linear interpolation over it.
 */
export function generateCheckpoints(points: Point[], totalLength: number): LetterCheckpoint[] {
  const N = clamp(Math.round(totalLength / 90), 6, 12)
  const segmentArcLength = totalLength / (N - 1)
  const radius = clamp(Math.round(segmentArcLength * 0.55), 35, 60)
  const checkpoints: LetterCheckpoint[] = []
  for (let i = 0; i < N; i++) {
    const frac = i / (N - 1)
    const p = pointAtArcLength(points, frac * totalLength)
    checkpoints.push({
      order: i + 1,
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      radius,
      name: `paso_${i + 1}`,
    })
  }
  return checkpoints
}

/**
 * (topY, bottomY) vertical span of the ruled zone the stroke is fitted into.
 * bottomY is the baseline the stroke bottom rests on; topY is the line the
 * stroke top should reach (middle line for media-height letters, etc.).
 */
function zoneBounds(zone: BaselineZone): { topY: number; bottomY: number } {
  switch (zone) {
    case 'alta':
      return { topY: TOP_LINE_Y, bottomY: BASELINE_Y }
    case 'baja':
      return { topY: MIDDLE_LINE_Y, bottomY: DESCENDER_LINE_Y }
    case 'mixta':
      return { topY: TOP_LINE_Y, bottomY: DESCENDER_LINE_Y }
    case 'media':
    default:
      return { topY: MIDDLE_LINE_Y, bottomY: BASELINE_Y }
  }
}

export interface RuledAdjustment {
  /** Points after the uniform affine fit (rounded to 2 decimals). */
  points: Point[]
  /** Uniform scale applied on both axes. */
  scaleX: number
  scaleY: number
  /** Translation applied (added after scaling). */
  tx: number
  ty: number
}

/**
 * Fit a dense polyline onto a ruled zone: scale UNIFORMLY (preserve aspect) so
 * the stroke height fills the zone's vertical span (capped by a 500px width
 * budget to avoid overflow), rest the stroke BOTTOM on the zone baseline, and
 * center horizontally at x=500. Returns the fitted points (rounded) plus the
 * exact affine params so the original `d` can be transformed identically.
 */
export function adjustToRuledZone(points: Point[], zone: BaselineZone): RuledAdjustment {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const bboxW = maxX - minX
  const bboxH = maxY - minY
  const safeW = bboxW > 0 ? bboxW : 1
  const safeH = bboxH > 0 ? bboxH : 1

  const { topY, bottomY } = zoneBounds(zone)
  const targetH = bottomY - topY
  const targetW = 500
  const scale = Math.min(targetH / safeH, targetW / safeW)
  const tx = 500 - ((minX + maxX) / 2) * scale
  const ty = bottomY - maxY * scale

  const rounded = (n: number): number => Math.round(n * 100) / 100
  const fitted: Point[] = points.map((p) => ({
    x: rounded(p.x * scale + tx),
    y: rounded(p.y * scale + ty),
  }))
  return { points: fitted, scaleX: scale, scaleY: scale, tx, ty }
}

/**
 * Rewrite an SVG path `d` applying a per-axis affine transform to EVERY
 * coordinate, preserving the command structure (M/L/C/Q/Z, relative variants
 * handled) and the subpath order. CURVES ARE KEPT (C/Q control points are
 * transformed too). Coordinates are rounded to 2 decimals.
 *
 * Uses its own tokenizer — does NOT touch resample.ts / pathEndpoints.ts.
 */
export function transformPathD(
  d: string,
  scaleX: number,
  scaleY: number,
  tx: number,
  ty: number,
): string {
  // Widened to the full command alphabet so an unexpected command (the
  // stored `d` should only ever contain M/L, but this stays defensive) is
  // actually ROUTED to `setCmd` and fails loud by name, instead of being
  // silently skipped by a tokenizer that never recognized the letter.
  const tokenRe = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?)/g
  const round = (n: number): number => Math.round(n * 100) / 100
  let out = ''
  let cmd: string | null = null
  let rel = false
  let needs = 0
  let remaining = 0
  let expectingX = true

  const setCmd = (letter: string): void => {
    cmd = letter.toUpperCase()
    rel = letter === letter.toLowerCase() && letter !== letter.toUpperCase()
    switch (cmd) {
      case 'M':
      case 'L':
        needs = 2
        break
      case 'C':
        needs = 6
        break
      case 'Q':
        needs = 4
        break
      case 'Z':
        needs = 0
        break
      default:
        // transformPathD only ever receives the stored M/L polyline (never
        // arcs/H/V/S/T — those are converted away before storage), so a
        // command outside {M,L,C,Q,Z} is unexpected: fail loud by name
        // instead of silently treating it as a no-op like `Z`.
        throw new Error(`transformPathD: unsupported path command "${letter}"`)
    }
    remaining = needs
    expectingX = true
    out += (out.length ? ' ' : '') + letter
  }

  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(d)) !== null) {
    if (m[1]) {
      setCmd(m[1])
      continue
    }
    if (m[2] === undefined || cmd === null) continue
    if (remaining === 0) {
      // Implicit continuation subcommand (M → L; C/Q/L repeat themselves).
      const cont = cmd === 'M' ? 'L' : cmd
      setCmd(rel ? cont.toLowerCase() : cont)
    }
    const num = parseFloat(m[2])
    const t = expectingX ? num * scaleX + (rel ? 0 : tx) : num * scaleY + (rel ? 0 : ty)
    out += ' ' + round(t)
    expectingX = !expectingX
    remaining -= 1
  }
  return out
}

/**
 * Build a complete LetterConfig from a single-stroke path `d`:
 *  - The path is flattened to a dense polyline, then REORDERED into writing
 *    order (a single subpath is passed through unchanged; multiple subpaths
 *    are classified — main = the one starting nearest the entry anchor, then
 *    pen-lift secondaries — see {@link classifySubpaths}), then arc-length
 *    resampled.
 *  - `d`: the REORDERED + NORMALIZED polyline (`M … L …`), so the demo and the
 *    guide follow the writing direction, not the SVG composition order.
 *  - `guideD`: undefined — there is no glyph contour; TraceCanvas already
 *    handles a missing guide.
 *  - `anchors`: entry = fitted MAIN start, exit = fitted MAIN end
 *    (`pointAtArcLength(fitted, mainEndArc * scaleX)`), in viewBox space.
 *  - `ideal`: a dense centerline cloud (resample(fitted, 600)) plus a ±8px
 *    perpendicular band per sample, so the area-cloud scoring rewards strokes
 *    drawn ON the line. ~1800 points total.
 *  - `strokeWidth`: 14.
 *  - `checkpoints`: generated over resample(fitted, 400), N = clamp(round(L/90), 6, 12).
 *  - `family: 'ola'`, `baselineZone` from the char, ola/mar theme, and the
 *    standard 3-step animation timeline (slide_in bg → draw_path → fade_out).
 *
 * Anchor-aware diagnostics (80px tolerance): warns when the stroke does not
 * START near the entry anchor (baseline-left of the MAIN span) or does not END
 * near its letter's exit corner — bottom-right by default, top-right for
 * `o v w`, mid-right for `b e`. No false fires when a stroke ends at its
 * declared exit anchor; a genuinely wrong end still warns. The gap warning for
 * multi-subpath paths is suppressed for the declared secondary-stroke letters
 * (`i j t f x`), whose dot / cross / second diagonal are intentional pen lifts.
 */
export function buildLetterConfig(character: string, d: string): LetterConfig {
  const zone = resolveBaselineZone(character)

  // 1) Flatten the raw SVG path into a dense polyline (path-composition order).
  const flat = flattenPathD(d)
  if (flat.points.length < 3) {
    throw new Error(
      `[svgLetter] buildLetterConfig('${character}'): el path no produce ≥3 puntos al aplanar ` +
        `(¿sin comando M o trazo demasiado corto?). Revisá el SVG en Figma.`,
    )
  }

  // 2) Put the stroke into WRITING order. We DO NOT guess connections: the
  // path order is the author's real stroke (a single subpath is returned
  // VERBATIM; multiple subpaths are classified main-first — see
  // reorderForWriting). `hasGaps` flags subpaths that jump > 15px apart; for
  // declared secondary-stroke letters (i j t f x) that jump is the intentional
  // dot / cross / second-diagonal pen lift, so the gap warning is suppressed.
  const reordered = reorderForWriting(flat.points, flat.starts)
  if (reordered.hasGaps && !SECONDARY_STROKE_CHARS.has(character.toLowerCase())) {
    console.warn(
      `[svgLetter] El SVG de '${character}' tiene subpaths separados por más de 15px; ` +
        'el orden de checkpoints es main-first (el subpath principal primero y los ' +
        'secundarios después). Para un recorrido de escritura perfecto exportá la letra ' +
        'como UN solo subpath continuo (un solo M) arrancando en el extremo ' +
        'inferior-izquierdo y terminando en el derecho.',
    )
  }

  // 3) Arc-length resample to a uniform 500-point centerline.
  const resampled = resample(reordered.points, 500)

  // 4) Normalize onto the ruled zone (baseline / middle line / centered).
  const fitted = adjustToRuledZone(resampled, zone)

  // 5) MAIN span + anchor-aware diagnostics.
  // The MAIN subpath's span is the letter body: its corners are derived from
  // the raw main-subpath bbox mapped through the affine fit, so a secondary
  // dot / cross must NOT shift the exit corner. Start is checked against the
  // entry anchor (baseline-left = bottom-left of the MAIN span); the end
  // against the letter's exit corner per kind — baseline → (maxX, maxY),
  // top → (maxX, minY), mid → (maxX, midY). Tolerance 80px: an end near its
  // declared exit anchor never warns; a genuinely wrong end still does.
  const mainSpanEnd = mainSpanEndIndex(reordered.points, reordered.mainEndArc)
  let mMinX = Infinity
  let mMaxX = -Infinity
  let mMinY = Infinity
  let mMaxY = -Infinity
  for (let i = 0; i < mainSpanEnd; i++) {
    const p = reordered.points[i]
    if (p.x < mMinX) mMinX = p.x
    if (p.x > mMaxX) mMaxX = p.x
    if (p.y < mMinY) mMinY = p.y
    if (p.y > mMaxY) mMaxY = p.y
  }
  // Main-span corners in FITTED space (uniform affine: an axis-aligned bbox
  // maps to an axis-aligned bbox).
  const mainMinX = mMinX * fitted.scaleX + fitted.tx
  const mainMaxX = mMaxX * fitted.scaleX + fitted.tx
  const mainMinY = mMinY * fitted.scaleY + fitted.ty
  const mainMaxY = mMaxY * fitted.scaleY + fitted.ty

  // The writing anchors, in viewBox space: entry = fitted MAIN start; exit =
  // the fitted MAIN end. The main end's arc position survives resample
  // (arc-length preserving) and scales uniformly with the fit.
  const firstFitted = fitted.points[0]
  const mainEnd = pointAtArcLength(fitted.points, reordered.mainEndArc * fitted.scaleX)
  const entry: Point = { x: firstFitted.x, y: firstFitted.y }
  const exit: Point = {
    x: Math.round(mainEnd.x * 100) / 100,
    y: Math.round(mainEnd.y * 100) / 100,
  }

  // Diagnostic: a correctly-ducted letter should START near the entry anchor
  // (baseline-left). We no longer rotate by ourselves, so if the first node
  // is far from that corner the author must fix the draw in the editor;
  // checkpoint 1 will land wherever the (non-rotated) path begins.
  if (Math.hypot(entry.x - mainMinX, entry.y - mainMaxY) > 80) {
    console.warn(
      `[svgLetter] El trazo de ${character} no arranca cerca del extremo inferior-izquierdo del renglón (ancla de entrada); revisá en el editor que el primer nodo toque la línea base abajo a la izquierda.`,
    )
  }

  // Diagnostic: the stroke should END near its letter's exit corner — the
  // bottom-right, top-right or mid-right of the MAIN span per exit kind
  // (default baseline; o v w → top; b e → mid). No false fires at the anchor.
  const exitKind = exitKindFor(character)
  let cornerY = mainMaxY
  if (exitKind === 'top') cornerY = mainMinY
  else if (exitKind === 'mid') cornerY = (mainMinY + mainMaxY) / 2
  const kindLabel = exitKind === 'top' ? 'superior' : exitKind === 'mid' ? 'medio' : 'inferior'
  if (Math.hypot(exit.x - mainMaxX, exit.y - cornerY) > 80) {
    console.warn(
      `[svgLetter] El trazo de ${character} no termina cerca del extremo ${kindLabel}-derecho; revisá la letra en Figma.`,
    )
  }

  // 6) The stored `d` is the REORDERED + NORMALIZED polyline so the animated
  // demo (framer-motion pathLength in TraceCanvas) and the guide follow the
  // writing order, not the SVG composition order.
  const dNorm = pathFromPoints(fitted.points)

  // 6b) Derived render `segments` for multi-subpath letters (letter-model
  // "LetterConfig Shape"): split the FITTED polyline at the same arc length
  // stored as `mainEndArc` (arc length is preserved by resample and scales
  // uniformly with the fit, so `reordered.mainEndArc * fitted.scaleX` is the
  // exact cut in `fitted.points` space — the same value `exit` uses above).
  // `segments` stays undefined for a single subpath; storage `d` is untouched
  // either way (never split by `M`).
  const isMultiSubpath = flat.starts.length > 1
  const segments: string[] | undefined = isMultiSubpath
    ? (() => {
        const { main, tail } = splitMainTail(fitted.points, reordered.mainEndArc * fitted.scaleX)
        return [pathFromPoints(main), pathFromPoints(tail)]
      })()
    : undefined

  // 7) Checkpoints, uniform in arc length over the fitted centerline.
  const sampled = resample(fitted.points, 400)
  const totalLength = polylineLength(sampled)
  const checkpoints = generateCheckpoints(sampled, totalLength)

  // 8) Ideal cloud: dense centerline + a ±8px perpendicular band per sample.
  const center = resample(fitted.points, 600)
  const BAND = 8
  const ideal: Array<[number, number]> = []
  for (let i = 0; i < center.length; i++) {
    const prev = center[Math.max(0, i - 1)]
    const next = center[Math.min(center.length - 1, i + 1)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const c = center[i]
    ideal.push([Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10])
    ideal.push([
      Math.round((c.x + nx * BAND) * 10) / 10,
      Math.round((c.y + ny * BAND) * 10) / 10,
    ])
    ideal.push([
      Math.round((c.x - nx * BAND) * 10) / 10,
      Math.round((c.y - ny * BAND) * 10) / 10,
    ])
  }

  return {
    id: `letra_${character}`,
    character,
    family: 'ola',
    baselineZone: zone,
    anchors: { entry, exit },
    theme: {
      backgroundColor: 'rgba(224, 242, 254, 0.4)',
      watermarkAssetSvg: '/assets/themes/mar_ola_a.svg',
    },
    pathDefinition: {
      d: dNorm,
      guideD: undefined,
      ideal,
      strokeWidth: 14,
      checkpoints,
      // Main-end arc + derived segments recorded ONLY for multi-subpath
      // letters (the reordered main span's arc length, mapped through the
      // uniform fit). Absent for a single subpath ⇒ consumers treat the cut
      // as `d` end and render `d` verbatim.
      ...(isMultiSubpath
        ? {
            mainEndArc: Math.round(reordered.mainEndArc * fitted.scaleX * 100) / 100,
            segments,
          }
        : {}),
    },
    // Solo animationTimeline: a single-subpath letter keeps the original
    // one-step draw_path (no properties.d — the demo falls back to the
    // letter's `d`). A multi-subpath letter emits ONE draw_path per segment
    // (MAIN 2600ms, then each SECONDARY 600ms), each carrying `properties.d`
    // so the demo/guide never draw a line across the pen lift (letter-model
    // "Solo animationTimeline mirrors segments").
    animationTimeline: [
      {
        id: `slide_in_${character}`,
        type: 'slide_in',
        target: 'background_theme',
        duration: 600,
        properties: { y: [100, 0], opacity: [0, 0.8] },
      },
      ...(segments
        ? segments.map((segD, idx) => ({
            id: `draw_path_${character}_${idx + 1}`,
            type: 'draw_path' as const,
            target: 'ink_demonstration' as const,
            delay: 1000 + (idx === 0 ? 0 : 2600),
            duration: idx === 0 ? 2600 : 600,
            properties: { d: segD },
          }))
        : [
            {
              id: `draw_path_${character}`,
              type: 'draw_path' as const,
              target: 'ink_demonstration' as const,
              delay: 1000,
              duration: 2600,
            },
          ]),
      {
        id: `fade_out_${character}`,
        type: 'fade_out',
        target: 'thematic_asset',
        delay: segments ? 1000 + 2600 + 600 + 200 : 3800,
        duration: 600,
        properties: { opacity: 0.08 },
      },
    ],
  }
}

/**
 * Word eligibility (letter-model "Word Eligibility"): a LETTER passes when the
 * first point of its stored `d` (flattened) lies within 15px of its `entry`
 * anchor. The check does NOT require `d.end === exit` (false for multi-subpath
 * letters — an `i` ends at its dot); the main end resolves via `anchors.exit`
 * or the stored `mainEndArc`. Kalam-seed glyphs (closed contours whose first
 * point sits far from the entry anchor) MUST fail. The registry lookup is the
 * CALLER's responsibility (buildWord / nextWord resolve it first).
 */
export function isWordEligible(letter: LetterConfig): boolean {
  const flat = flattenPathD(letter.pathDefinition.d)
  const first = flat.points[0]
  if (!first) return false
  return Math.hypot(first.x - letter.anchors.entry.x, first.y - letter.anchors.entry.y) <= 15
}

// Eager Vite glob of every hand-drawn letter SVG in this folder (?raw → string).
// Resolved at transform time, so an empty folder yields {} and the Kalam seeds
// remain the source of truth.
const svgModules = import.meta.glob('./svg/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * Load every hand-drawn letter SVG into a `Record<char, LetterConfig>` where the
 * key is the file name without extension. Files without a usable `<path>` are
 * warned about and skipped. Returns `{}` when no SVGs are present.
 */
export function loadSvgLetters(): Record<string, LetterConfig> {
  const result: Record<string, LetterConfig> = {}
  for (const [filePath, raw] of Object.entries(svgModules)) {
    const fileName = filePath.split('/').pop()?.replace(/\.svg$/i, '') ?? ''
    if (!fileName) continue
    const d = extractPathD(raw)
    if (!d) {
      console.warn(`[svgLetter] No <path> found in ${filePath}; skipping.`)
      continue
    }
    result[fileName] = buildLetterConfig(fileName, d)
  }
  return result
}
