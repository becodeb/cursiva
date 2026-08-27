// Test-only reference utilities for the canvas suites (same pattern as
// letters/pathEndpoints.ts): an INDEPENDENT cubic-Bézier flattening and arc
// walk, so resample/samplePath tests assert against a reference
// implementation rather than the module under test.
import type { Point } from '../letters/types'

/**
 * Cubic-Bézier subdivision density of the reference flatten. Mirrors
 * resample.ts SEGMENT_STEPS (co-designed pair): the reference polyline must
 * match the ideal sampler's density so "perfect = 100" holds exactly.
 */
const REF_STEPS = 96

/** Independent flatten of SVG `d` (M + C) via the textbook cubic Bézier basis. */
export function referenceFlattenPath(d: string): Point[] {
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
      for (let s = 1; s <= REF_STEPS; s++) {
        const t = s / REF_STEPS
        const mt = 1 - t
        polyline.push({
          x: mt ** 3 * p0.x + 3 * mt ** 2 * t * x1 + 3 * mt * t ** 2 * x2 + t ** 3 * x,
          y: mt ** 3 * p0.y + 3 * mt ** 2 * t * y1 + 3 * mt * t ** 2 * y2 + t ** 3 * y,
        })
      }
      current = { x, y }
      i += 7
    } else {
      throw new Error(`Unexpected path token: ${token}`)
    }
  }
  return polyline
}

/**
 * Absolute arc position of a point along a polyline via an independent walk
 * (point on the segment where `dist(p,a) + dist(p,b) ≈ len`). Asserts the
 * true arc-length contract: resampled points sit at exactly
 * `i · totalLength/(k−1)`, even though chord distances shrink across bends.
 */
export function arcPositionOf(polyline: Point[], p: Point): number {
  let cum = 0
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1]
    const b = polyline[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const dA = Math.hypot(p.x - a.x, p.y - a.y)
    if (dA <= len + 1e-9) {
      const dB = Math.hypot(p.x - b.x, p.y - b.y)
      if (Math.abs(dA + dB - len) < 1e-6) return cum + dA
    }
    cum += len
  }
  return cum
}

/** Total arc length of a polyline. */
export function arcLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return total
}