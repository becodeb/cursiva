// Tapering corridor geometry (`LevelConfig.taper`, docs/01 principle 3: "el
// canal empieza ancho y se estrecha con el dominio"). The adaptive tolerance
// narrows the channel BETWEEN attempts; a taper narrows it WITHIN one attempt,
// along the route, so the same sendero starts forgiving and ends demanding.
//
// An SVG `<path>` carries exactly ONE `stroke-width`, so a single stroked path
// can never narrow. The corridor is therefore emitted as a chain of short
// sub-paths cut at equal arc length, each with its own interpolated width.
// Round caps and joins hide the seams: consecutive pieces share an endpoint and
// differ by ~1/40 of the total change, which reads as one continuous channel
// rather than 40 sausages.
//
// Pure and DOM-free. `flattenPathD` walks the `d` string itself, so this runs
// under `renderToString` — using `SVGGeometryElement.getTotalLength()` would
// have made the corridor unrenderable on the server and untestable in the
// node-environment suite.
import { flattenPathD, polylineLength } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import type { Taper } from '../levels/types'

/** Sub-paths emitted across the WHOLE route. 40 keeps the width step below one
 * viewBox unit on every catalogued corridor, which is under a rendered pixel. */
export const TAPER_SEGMENTS = 40

/** One stroked piece of the corridor: its own geometry and its own width. */
export interface CorridorSegment {
  d: string
  width: number
}

/** Sheet coordinates are authored to 1 decimal (see `buildLevel`); the emitted
 * `d` matches so a taper never inflates the markup with float noise. */
function round1(v: number): number {
  return Math.round(v * 10) / 10
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Every subpath of `d`, in path order. `flattenPathD` returns one `starts`
 * entry per `M`, so a letter's pen-lift segments stay SEPARATE polylines — a
 * taper must never draw the jump between them as corridor.
 */
function subpathsOf(d: string): Point[][] {
  const { points, starts } = flattenPathD(d)
  if (points.length < 2 || starts.length === 0) return []
  const out: Point[][] = []
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i]
    const to = i + 1 < starts.length ? starts[i + 1] : points.length
    if (to - from >= 2) out.push(points.slice(from, to))
  }
  return out
}

/**
 * The part of `points` between arc lengths `s0` and `s1`, with interpolated
 * endpoints. The ORIGINAL vertices inside the window are kept, so a piece cut
 * out of a spiral is still curved — resampling each piece to a chord would
 * flatten every tight bend into a polygon.
 */
function sliceByArc(points: Point[], s0: number, s1: number): Point[] {
  const out: Point[] = []
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (seg <= 0) continue
    const start = acc
    acc += seg
    if (acc < s0 || start > s1) continue
    const t0 = Math.max(0, (s0 - start) / seg)
    const t1 = Math.min(1, (s1 - start) / seg)
    if (t1 < t0) continue
    if (out.length === 0) out.push({ x: lerp(a.x, b.x, t0), y: lerp(a.y, b.y, t0) })
    out.push({ x: lerp(a.x, b.x, t1), y: lerp(a.y, b.y, t1) })
  }
  return out
}

function toPathD(points: Point[]): string {
  const head = points[0]
  let d = `M ${round1(head.x)} ${round1(head.y)}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${round1(points[i].x)} ${round1(points[i].y)}`
  }
  return d
}

/**
 * The corridor as width-varying pieces. `taper.from` multiplies `width` at the
 * START of the route and `taper.to` at its END; the fraction is measured over
 * the COMBINED arc length of every path, so a multi-segment level keeps
 * narrowing across its pen lifts instead of restarting at each `M`.
 *
 * Returns `[]` for a degenerate route (no path, or zero length) — the caller
 * then falls back to the plain constant-width stroke.
 */
export function taperedCorridor(
  paths: readonly string[],
  width: number,
  taper: Taper,
  segments: number = TAPER_SEGMENTS,
): CorridorSegment[] {
  const routes: Point[][] = []
  for (const d of paths) routes.push(...subpathsOf(d))
  const lengths = routes.map(polylineLength)
  const total = lengths.reduce((a, b) => a + b, 0)
  if (routes.length === 0 || total <= 0) return []

  const out: CorridorSegment[] = []
  let travelled = 0
  for (let r = 0; r < routes.length; r++) {
    const points = routes[r]
    const length = lengths[r]
    if (length <= 0) continue
    // Pieces are shared out in PROPORTION to each subpath's length, so a short
    // accent bar does not get the same 40 cuts as a full-width sendero.
    const count = Math.max(1, Math.round((segments * length) / total))
    for (let i = 0; i < count; i++) {
      const s0 = (length * i) / count
      const s1 = (length * (i + 1)) / count
      const slice = sliceByArc(points, s0, s1)
      if (slice.length < 2) continue
      // Width comes from the piece's arc MIDPOINT: sampling an endpoint would
      // bias the whole corridor half a piece wide or narrow.
      const fraction = (travelled + (s0 + s1) / 2) / total
      out.push({ d: toPathD(slice), width: width * lerp(taper.from, taper.to, fraction) })
    }
    travelled += length
  }
  return out
}
