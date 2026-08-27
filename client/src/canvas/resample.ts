// Arc-length resampling (trace-canvas "Arc-Length Resampling") plus the
// ideal-path `d` → K-point sampler driving letter-checkpoints parity
// (tasks T3.2; the spec formula's Ideal[] = ideal path arc-sampled to K).
import type { Point } from '../letters/types'
import { K } from './validation/constants'

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/**
 * Resample a stroke to exactly `k` equidistant points ALONG its arc length.
 * `k` points span k−1 intervals of `totalLength/(k−1)`, so first/last output
 * points equal the captured endpoints (the spec's "spaced totalLength/K
 * apart", endpoint-inclusive). Chord distances between outputs shrink across
 * bends — arc position is the contract, not chord length.
 *
 * Fewer than 2 *distinct* points ⇒ empty: no arc to measure, and downstream
 * evaluation must not run (trace-validation "Empty stroke not evaluated").
 */
export function resample(points: Point[], k: number = K): Point[] {
  if (k < 2) return points.slice(0, 1)
  if (points.length < 2) return []

  const first = points[0]
  if (!points.some((p) => p.x !== first.x || p.y !== first.y)) return []

  const cum: number[] = [0] // cum[i] = arc length up to points[i]
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += dist(points[i - 1], points[i])
    cum.push(total)
  }

  const out: Point[] = []
  const step = total / (k - 1)
  let seg = 0
  for (let i = 0; i < k; i++) {
    const target = i * step
    while (seg < cum.length - 2 && cum[seg + 1] < target) seg++
    const segLen = cum[seg + 1] - cum[seg]
    const t = segLen === 0 ? 0 : (target - cum[seg]) / segLen
    out.push({
      x: points[seg].x + (points[seg + 1].x - points[seg].x) * t,
      y: points[seg].y + (points[seg + 1].y - points[seg].y) * t,
    })
  }
  return out
}

/**
 * Cubic-Bézier subdivision density used to flatten path `d`. 96 steps (vs the
 * original 24) make the sampled ideal converge to TRUE arc positions (0.5px
 * bias → ~0.002px): the 24-step flatten under-measured the arc through tight
 * turns, so even a perfect dense trace scored ~97 and mastery (exactly 100,
 * bloom) was unreachable at runtime. The reference flatten in testUtils.ts
 * mirrors this density (co-designed pair).
 */
const SEGMENT_STEPS = 96

/**
 * Sample a letter's ideal `d` (SVG `M` + `C`, as authored by the seeds) to
 * exactly `k` equidistant points: flatten into a dense polyline that includes
 * every segment endpoint (= every checkpoint), then `resample`. The sampled
 * ideal mirrors the user-stroke pipeline and preserves ductus order
 * (trace-canvas "Sampled ideal path preserves order" scenario via `c`).
 */
export function samplePath(d: string, k: number = K): Point[] {
  if (!d.trim()) return []
  const polyline: Point[] = []
  const tokens = d.trim().split(/[\s,]+/)
  let i = 0
  let current: Point | null = null
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === 'M') {
      current = { x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) }
      polyline.push(current)
      i += 3
    } else if (token === 'C') {
      if (current === null) throw new Error(`Path data must start with M: ${d}`)
      const x1 = Number(tokens[i + 1])
      const y1 = Number(tokens[i + 2])
      const x2 = Number(tokens[i + 3])
      const y2 = Number(tokens[i + 4])
      const x = Number(tokens[i + 5])
      const y = Number(tokens[i + 6])
      const p0 = current
      for (let s = 1; s <= SEGMENT_STEPS; s++) {
        const t = s / SEGMENT_STEPS
        const mt = 1 - t
        const px = mt ** 3 * p0.x + 3 * mt ** 2 * t * x1 + 3 * mt * t ** 2 * x2 + t ** 3 * x
        const py = mt ** 3 * p0.y + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y
        polyline.push({ x: px, y: py })
      }
      current = { x, y }
      i += 7
    } else {
      throw new Error(`Unexpected path token: ${token}`)
    }
  }
  if (polyline.length < 2) return []
  return resample(polyline, k)
}