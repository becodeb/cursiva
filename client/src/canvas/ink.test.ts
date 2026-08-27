// ink.ts contract tests (trace-canvas "Ink Rendering", T3.3): geometry
// asserted independently (point-in-polygon, distances), not via module helpers.
import { describe, expect, it } from 'vitest'
import type { Point } from '../letters/types'
import { inkPath, traceInk } from './ink'

/** Even-odd ray-cast point-in-polygon test (2D). */
function pointInPolygon(p: Point, poly: ReadonlyArray<readonly [number, number]>): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Distance from a point to the nearest point of the centerline polyline. */
function distanceToCenterline(p: Point, centerline: readonly Point[]): number {
  let min = Infinity
  for (let i = 1; i < centerline.length; i++) {
    const a = centerline[i - 1]
    const b = centerline[i]
    const abx = b.x - a.x
    const aby = b.y - a.y
    const len2 = abx * abx + aby * aby
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2))
    min = Math.min(min, Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t)))
  }
  return min
}

// A gentle S-curve — enough bends to prove the polygon *outlines* the path.
const arc: Point[] = [
  { x: 100, y: 300 },
  { x: 200, y: 270 },
  { x: 300, y: 320 },
  { x: 400, y: 280 },
  { x: 500, y: 310 },
  { x: 600, y: 275 },
  { x: 700, y: 300 },
]

describe('traceInk', () => {
  it('never mutates the captured points (render-only contract)', () => {
    const input = arc.map((p) => ({ ...p }))
    const snapshot = input.map((p) => ({ ...p }))
    const withPressure = input.map((p, i) => ({ ...p, pressure: 0.3 + i * 0.1 }))
    traceInk(withPressure)
    traceInk(input)
    expect(input).toEqual(snapshot)
    expect(withPressure.map(({ x, y }) => ({ x, y }))).toEqual(snapshot)
  })

  it('produces a closed polygon outlining the centerline (spec scenario)', () => {
    const polygon = traceInk(arc, { size: 12 })
    expect(polygon.length).toBeGreaterThanOrEqual(4)
    // The ribbon must ENCLOSE the centerline…
    expect(pointInPolygon(arc[3], polygon)).toBe(true)
    expect(pointInPolygon(arc[1], polygon)).toBe(true)
    expect(pointInPolygon(arc[5], polygon)).toBe(true)
    // …and stay close to it: every outline vertex within ~a stroke width,
    // while the widest vertex proves real thickness (measured half-width
    // ≈ 3.9 for size 12 under smoothing 0.5).
    const distances = polygon.map((p) => distanceToCenterline({ x: p[0], y: p[1] }, arc))
    expect(Math.max(...distances)).toBeGreaterThan(3)
    for (const d of distances) {
      expect(d).toBeLessThanOrEqual(9)
    }
  })

  it('renders a bounded dot for a tap (1 point) without crashing', () => {
    const polygon = traceInk([{ x: 500, y: 320 }], { size: 12 })
    expect(polygon.length).toBeGreaterThanOrEqual(4)
    for (const [x, y] of polygon) {
      expect(Math.hypot(x - 500, y - 320)).toBeLessThanOrEqual(12)
    }
  })

  it('renders a stroke for 2 points without crashing', () => {
    expect(traceInk([{ x: 100, y: 400 }, { x: 900, y: 400 }]).length).toBeGreaterThanOrEqual(4)
  })
})

describe('inkPath', () => {
  it('returns an empty d for an empty polygon', () => {
    expect(inkPath([])).toBe('')
  })

  it('builds an M…L…Z closed path, rounding to 2 decimals for stable d strings', () => {
    const d = inkPath([[10.123, 20.456], [30, 40], [50.987, 60.001]])
    expect(d).toBe('M10.12 20.46 L30 40 L50.99 60 Z')
  })
})