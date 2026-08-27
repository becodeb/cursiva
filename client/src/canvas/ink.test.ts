// ink.ts contract tests (trace-canvas "Ink Rendering"): the render is now a
// CENTERLINE polyline (M…L…, no Z, no polygon fill), so a doubled-back stroke
// cannot self-intersect-fill and leave "unfill" holes. Geometry asserted
// independently (string shape, no mutation), not via a fill region.
import { describe, expect, it } from 'vitest'
import type { Point } from '../letters/types'
import { inkPath, traceInk } from './ink'

// A gentle S-curve — enough bends to prove the centerline carries the points.
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
  it('returns the captured centerline in order and never mutates the input', () => {
    const input = arc.map((p) => ({ ...p }))
    const snapshot = input.map((p) => ({ ...p }))
    const withPressure = input.map((p, i) => ({ ...p, pressure: 0.3 + i * 0.1 }))
    const out = traceInk(withPressure)
    traceInk(input)
    expect(out).toEqual(arc.map((p) => [p.x, p.y] as [number, number]))
    expect(input).toEqual(snapshot) // untouched
    expect(withPressure.map(({ x, y }) => ({ x, y }))).toEqual(snapshot)
  })

  it('handles a single point (tap) without crashing', () => {
    expect(traceInk([{ x: 500, y: 320 }])).toEqual([[500, 320]])
  })

  it('handles 2 points without crashing', () => {
    expect(traceInk([{ x: 100, y: 400 }, { x: 900, y: 400 }]).length).toBe(2)
  })
})

describe('inkPath', () => {
  it('returns an empty d for an empty centerline', () => {
    expect(inkPath([])).toBe('')
  })

  it('builds an M…L open polyline WITHOUT Z (centerline stroke, no fill holes)', () => {
    const d = inkPath([[10.123, 20.456], [30, 40], [50.987, 60.001]])
    expect(d).toBe('M10.12 20.46 L30 40 L50.99 60')
    expect(d).not.toContain('Z')
    expect(d.startsWith('M')).toBe(true)
  })

  it('a doubled-back centerline stays a single open polyline (no Z → no holes)', () => {
    // Trace forward then back over itself (the case that produced "unfill" holes
    // with the old filled polygon).
    const doubled: Point[] = [
      { x: 100, y: 300 },
      { x: 300, y: 300 },
      { x: 500, y: 300 },
      { x: 300, y: 300 },
      { x: 100, y: 300 },
    ]
    const d = inkPath(traceInk(doubled))
    expect(d.startsWith('M')).toBe(true)
    expect(d).not.toContain('Z') // an open stroke cannot self-intersect-fill
    // Every vertex is preserved (no polygon expansion).
    expect(d.match(/L/g)?.length).toBe(4)
  })
})
