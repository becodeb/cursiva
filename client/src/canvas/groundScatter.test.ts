import { describe, it, expect } from 'vitest'
import { grassScatter, mudScatter, type ScatterInput, type ScatterMark } from './groundScatter'
import type { Point } from '../letters/types'

const VIEWBOX = { x: 0, y: 0, width: 1000, height: 600 }

/** A straight route across the middle of the sheet. Straight on purpose: the
 * distance invariants below are then readable by hand, so a failure points at
 * the scatter rather than at the test's own geometry. */
function straight(x0: number, x1: number, y = 300, steps = 40): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) pts.push({ x: x0 + ((x1 - x0) * i) / steps, y })
  return pts
}

function elbow(): Point[] {
  return [
    { x: 100, y: 120 },
    { x: 500, y: 120 },
    { x: 500, y: 480 },
    { x: 900, y: 480 },
  ]
}

function input(over: Partial<ScatterInput> = {}): ScatterInput {
  return {
    polyline: straight(60, 940),
    halfWidthAt: () => 60,
    viewBox: VIEWBOX,
    artCount: 8,
    seed: 1234,
    ...over,
  }
}

/** Distance from a mark to the polyline, and the arc fraction of the closest
 * point — recomputed here independently of the module under test. */
function probe(polyline: readonly Point[], p: { x: number; y: number }): { d: number; t: number } {
  let total = 0
  for (let i = 1; i < polyline.length; i++) {
    total += Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y)
  }
  let best = Infinity
  let arc = 0
  let acc = 0
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1]
    const b = polyline[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const u = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
    const d = Math.hypot(p.x - (a.x + dx * u), p.y - (a.y + dy * u))
    if (d < best) {
      best = d
      arc = acc + Math.sqrt(len2) * u
    }
    acc += Math.sqrt(len2)
  }
  return { d: best, t: total > 0 ? arc / total : 0 }
}

describe('groundScatter — determinism', () => {
  it('the same seed and route give byte-identical marks', () => {
    expect(grassScatter(input())).toEqual(grassScatter(input()))
    expect(mudScatter(input())).toEqual(mudScatter(input()))
  })

  it('a different seed gives a different field', () => {
    const a = grassScatter(input())
    const b = grassScatter(input({ seed: 99 }))
    expect(a).not.toEqual(b)
    // …but the same SHAPE of field: the lattice is fixed, only the jitter moves.
    expect(Math.abs(a.length - b.length)).toBeLessThan(a.length / 2)
  })

  it('never calls Math.random — a re-run after Math.random advances is unchanged', () => {
    const first = mudScatter(input())
    for (let i = 0; i < 50; i++) Math.random()
    expect(mudScatter(input())).toEqual(first)
  })

  it('is stable when the polyline is rebuilt with equal values', () => {
    const a = grassScatter(input({ polyline: straight(60, 940) }))
    const b = grassScatter(input({ polyline: straight(60, 940) }))
    expect(a).toEqual(b)
  })
})

describe('groundScatter — grass never grows on the path', () => {
  const poly = straight(60, 940)
  const halfWidth = 60

  it('every tuft clears the corridor edge', () => {
    const marks = grassScatter(input({ polyline: poly, halfWidthAt: () => halfWidth }))
    expect(marks.length).toBeGreaterThan(40)
    for (const m of marks) {
      expect(probe(poly, m).d).toBeGreaterThan(halfWidth)
    }
  })

  it('clears a TAPERED corridor at its local width, not a global one', () => {
    const halfWidthAt = (t: number): number => 20 + 80 * t
    const marks = grassScatter(input({ polyline: poly, halfWidthAt }))
    for (const m of marks) {
      const { d, t } = probe(poly, m)
      expect(d).toBeGreaterThan(halfWidthAt(t))
    }
  })

  it('rejects tufts — a wide corridor leaves fewer than a narrow one', () => {
    const narrow = grassScatter(input({ halfWidthAt: () => 20 }))
    const wide = grassScatter(input({ halfWidthAt: () => 200 }))
    expect(wide.length).toBeLessThan(narrow.length)
  })

  it('holds the invariant on a route with corners', () => {
    const poly2 = elbow()
    const marks = grassScatter(input({ polyline: poly2, halfWidthAt: () => 55 }))
    expect(marks.length).toBeGreaterThan(20)
    for (const m of marks) expect(probe(poly2, m).d).toBeGreaterThan(55)
  })
})

describe('groundScatter — mud stays inside the corridor', () => {
  it('every clump lands within the half width', () => {
    const poly = straight(60, 940)
    const marks = mudScatter(input({ polyline: poly, halfWidthAt: () => 60 }))
    expect(marks.length).toBeGreaterThan(5)
    for (const m of marks) expect(probe(poly, m).d).toBeLessThanOrEqual(60)
  })

  it('follows an elbow instead of cutting the corner', () => {
    const poly = elbow()
    const marks = mudScatter(input({ polyline: poly, halfWidthAt: () => 50 }))
    expect(marks.length).toBeGreaterThan(5)
    for (const m of marks) expect(probe(poly, m).d).toBeLessThanOrEqual(50)
  })

  it('spreads narrower where a taper has pinched the corridor', () => {
    const poly = straight(0, 4000, 300, 200)
    const marks = mudScatter(
      input({ polyline: poly, halfWidthAt: (t) => 100 - 90 * t }),
    )
    const spread = (from: number, to: number): number =>
      Math.max(
        ...marks
          .filter((m) => m.x >= from && m.x < to)
          .map((m) => Math.abs(m.y - 300)),
      )
    const wideEnd = spread(0, 1000)
    const narrowEnd = spread(3000, 4000)
    expect(narrowEnd).toBeLessThan(wideEnd)
    // The analytic bound: 0.62 x the local half width, which is at most 32.5
    // beyond t=0.75.
    expect(narrowEnd).toBeLessThanOrEqual(0.62 * 32.5)
  })

  it('stays subordinate to a 28-unit clue mark', () => {
    const marks = mudScatter(input())
    for (const m of marks) {
      expect(m.size).toBeGreaterThanOrEqual(13)
      expect(m.size).toBeLessThan(28)
    }
  })
})

describe('groundScatter — shape of the output', () => {
  const inRange = (marks: readonly ScatterMark[], artCount: number): void => {
    for (const m of marks) {
      expect(Number.isInteger(m.art)).toBe(true)
      expect(m.art).toBeGreaterThanOrEqual(0)
      expect(m.art).toBeLessThan(artCount)
      expect(Number.isFinite(m.x)).toBe(true)
      expect(Number.isFinite(m.y)).toBe(true)
      expect(m.size).toBeGreaterThan(0)
    }
  }

  it('keeps art indices inside the caller array', () => {
    inRange(grassScatter(input({ artCount: 3 })), 3)
    inRange(mudScatter(input({ artCount: 3 })), 3)
  })

  it('grass leans but never spins', () => {
    for (const m of grassScatter(input())) {
      expect(Math.abs(m.angle)).toBeLessThanOrEqual(7)
      expect(m.size).toBeGreaterThanOrEqual(30)
      expect(m.size).toBeLessThanOrEqual(52)
    }
  })

  it('covers the sheet rather than one band of it', () => {
    const marks = grassScatter(input())
    expect(Math.min(...marks.map((m) => m.y))).toBeLessThan(80)
    expect(Math.max(...marks.map((m) => m.y))).toBeGreaterThan(520)
    expect(Math.min(...marks.map((m) => m.x))).toBeLessThan(80)
    expect(Math.max(...marks.map((m) => m.x))).toBeGreaterThan(920)
  })

  it('follows a cropped viewBox origin', () => {
    const marks = grassScatter(input({ viewBox: { x: 0, y: 140, width: 1000, height: 440 } }))
    // The lattice tracks the crop rather than the sheet: nothing is scattered
    // anywhere near y=0 any more, only one overshoot step above the band.
    expect(Math.min(...marks.map((m) => m.y))).toBeGreaterThan(140 - 76 - 26)
    expect(Math.min(...marks.map((m) => m.y))).toBeLessThan(140)
  })

  it('overshoots the viewBox EVENLY on both sides, so no letterbox bar is bare', () => {
    // A contain fit letterboxes the viewBox inside a wider element and SVG
    // clips to the VIEWPORT, so these outside marks are what paint the bars.
    // Overshooting one side only is what made the sheet's own edge findable.
    const marks = grassScatter(input({ halfWidthAt: () => 60 }))
    const left = marks.filter((m) => m.x < 0).length
    const right = marks.filter((m) => m.x > 1000).length
    const above = marks.filter((m) => m.y < 0).length
    const below = marks.filter((m) => m.y > 600).length
    for (const side of [left, right, above, below]) expect(side).toBeGreaterThan(3)
    // …and it stays ONE step of overshoot, not an unbounded field.
    expect(Math.min(...marks.map((m) => m.x))).toBeGreaterThan(-(76 + 26))
    expect(Math.max(...marks.map((m) => m.x))).toBeLessThan(1000 + 76 + 26)
  })

  it('gives nothing for a degenerate route or an empty art array', () => {
    expect(grassScatter(input({ polyline: [] }))).toEqual([])
    expect(mudScatter(input({ polyline: [{ x: 1, y: 1 }] }))).toEqual([])
    expect(grassScatter(input({ artCount: 0 }))).toEqual([])
    expect(mudScatter(input({ artCount: 0 }))).toEqual([])
  })
})
