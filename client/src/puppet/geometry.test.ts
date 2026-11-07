import { describe, expect, it } from 'vitest'
import { ell, polyline, rad, sampleAnchored, seeded, smoothClosed, spine, tubePath, wobble, type Vec } from './geometry'

const near = (pts: readonly Vec[], x: number, y: number): boolean => pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 1e-6)

describe('sampleAnchored', () => {
  it('keeps every authored corner of a cut shape', () => {
    const pts = sampleAnchored('M0 0L100 0L100 50Z', 7)
    expect(near(pts, 0, 0)).toBe(true)
    expect(near(pts, 100, 0)).toBe(true)
    expect(near(pts, 100, 50)).toBe(true)
  })

  it('walks a straight edge about one step apart, without repeating the closing point', () => {
    const pts = sampleAnchored('M0 0L100 0Z', 10)
    // 10 samples out and 10 back; the point (0, 0) only once.
    expect(pts).toHaveLength(20)
    expect(pts.filter((p) => p[0] === 0 && p[1] === 0)).toHaveLength(1)
    expect(Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])).toBeCloseTo(10, 6)
  })

  it('ends an open path on its last anchor', () => {
    const pts = sampleAnchored('M0 0L10 0L10 30', 5)
    expect(pts[pts.length - 1]).toEqual([10, 30])
  })

  it('follows a cubic through its textbook midpoint', () => {
    // B(0.5) of (0,0) (0,40) (40,40) (40,0) is (20, 30).
    const pts = sampleAnchored('M0 0C0 40 40 40 40 0', 4)
    const closest = Math.min(...pts.map((p) => Math.hypot(p[0] - 20, p[1] - 30)))
    expect(closest).toBeLessThan(2.1)
  })

  it('follows a quadratic through its textbook midpoint', () => {
    // B(0.5) of (0,0) (20,40) (40,0) is (20, 20).
    const pts = sampleAnchored('M0 0Q20 40 40 0', 2)
    const closest = Math.min(...pts.map((p) => Math.hypot(p[0] - 20, p[1] - 20)))
    expect(closest).toBeLessThan(1.1)
  })

  it('never reduces a tiny ellipse to a diamond', () => {
    expect(sampleAnchored(ell(0, 0, 4, 5), 9).length).toBeGreaterThanOrEqual(12)
  })
})

describe('ell', () => {
  it('stays on the true ellipse within a fraction of a unit', () => {
    for (const [x, y] of sampleAnchored(ell(50, 20, 40, 25), 3)) {
      const r = Math.hypot((x - 50) / 40, (y - 20) / 25)
      expect(Math.abs(r - 1)).toBeLessThan(0.002)
    }
  })

  it('reaches its four extremes', () => {
    const pts = sampleAnchored(ell(0, 0, 10, 20), 3)
    for (const [x, y] of [[-10, 0], [10, 0], [0, -20], [0, 20]]) expect(near(pts, x, y)).toBe(true)
  })
})

describe('seeded', () => {
  it('repeats for a seed and differs across seeds, inside [0, 1)', () => {
    const a = seeded(7)
    const b = seeded(7)
    const c = seeded(8)
    const drawn = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(drawn)
    expect(c()).not.toBe(drawn[0])
    expect(drawn.every((v) => v >= 0 && v < 1)).toBe(true)
  })
})

describe('wobble', () => {
  const circle: Vec[] = Array.from({ length: 40 }, (_, i) => [Math.cos((i / 40) * 6.283) * 100, Math.sin((i / 40) * 6.283) * 100])

  it('is reproducible and moves points by a bounded amount', () => {
    const once = wobble(circle, 0.55, 3, true)
    expect(wobble(circle, 0.55, 3, true)).toEqual(once)
    // The three waves sum to at most (1/1.1 + 1/1.65 + 1/2.75) = 1.88 per axis.
    once.forEach((p, i) => {
      expect(Math.hypot(p[0] - circle[i][0], p[1] - circle[i][1])).toBeLessThan(0.55 * 1.88 * Math.SQRT2)
    })
    expect(once.some((p, i) => p[0] !== circle[i][0])).toBe(true)
  })

  it('has no seam on a closed loop: the last step is no bigger than the others', () => {
    const moved = wobble(circle, 0.55, 3, true).map((p, i) => Math.hypot(p[0] - circle[i][0], p[1] - circle[i][1]))
    expect(Math.abs(moved[0] - moved[moved.length - 1])).toBeLessThan(0.3)
  })
})

describe('spine and tubePath', () => {
  it('a straight spine has exactly length L along its heading', () => {
    const pts = spine({ x: 10, y: 20, a: rad(90), L: 120, n: 12 })
    const end = pts[pts.length - 1]
    expect(end[0]).toBeCloseTo(10, 6)
    expect(end[1]).toBeCloseTo(140, 6)
  })

  it('a tube is as wide as its width function, both sides of the spine', () => {
    const d = tubePath(spine({ x: 0, y: 0, a: 0, L: 100, n: 10 }), () => 8)
    const pts = sampleAnchored(d, 1000)
    const ys = pts.map((p) => p[1])
    expect(Math.max(...ys)).toBeCloseTo(8, 0)
    expect(Math.min(...ys)).toBeCloseTo(-8, 0)
    expect(d.endsWith('Z')).toBe(true)
  })
})

describe('path output', () => {
  it('polyline only closes when asked', () => {
    expect(polyline([[0, 0], [1, 2]], false)).toBe('M0.0 0.0L1.0 2.0')
    expect(polyline([[0, 0], [1, 2]], true)).toBe('M0.0 0.0L1.0 2.0Z')
  })

  it('smoothClosed passes through every point it is given', () => {
    const d = smoothClosed([[0, 0], [10, 0], [10, 10], [0, 10]])
    for (const anchor of ['10.0 0.0', '10.0 10.0', '0.0 10.0', '0.0 0.0']) expect(d).toContain(anchor)
  })
})
