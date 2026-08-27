import { describe, expect, it } from 'vitest'
import { letraC } from '../letters/letra_c'
import type { Point } from '../letters/types'
import { resample, samplePath } from './resample'
import { arcLength, arcPositionOf, referenceFlattenPath } from './testUtils'
import { K } from './validation/constants'

function nearestIndex(points: Point[], target: Point): number {
  let best = 0
  let bestDist = Infinity
  points.forEach((p, index) => {
    const d = Math.hypot(p.x - target.x, p.y - target.y)
    if (d < bestDist) {
      bestDist = d
      best = index
    }
  })
  return best
}

describe('resample (arc-length K equidistant)', () => {
  it('produces exactly K points at equal ARC intervals, anchored to first and last captured point', () => {
    const raw: Point[] = []
    for (let i = 0; i < 400; i++) {
      const t = i / 399
      raw.push({ x: 100 + t * 800, y: 300 + Math.sin(t * Math.PI * 4) * 100 })
    }

    const out = resample(raw, K)

    expect(out).toHaveLength(K)
    expect(out[0]).toEqual(raw[0])
    expect(out[K - 1].x).toBeCloseTo(raw[raw.length - 1].x, 6)
    expect(out[K - 1].y).toBeCloseTo(raw[raw.length - 1].y, 6)
    // True contract: equidistant ALONG the arc (chord distances shrink across
    // bends) — verify each point's arc position independently.
    const step = arcLength(raw) / (K - 1)
    out.forEach((p, index) => {
      expect(arcPositionOf(raw, p)).toBeCloseTo(index * step, 6)
    })
  })

  it('still resamples a two-distinct-point stroke to exactly K points', () => {
    const out = resample([{ x: 0, y: 0 }, { x: 100, y: 0 }], K)

    expect(out).toHaveLength(K)
    expect(out[0]).toEqual({ x: 0, y: 0 })
    out.forEach((p, index) => {
      expect(p.y).toBe(0)
      expect(p.x).toBeCloseTo((index * 100) / (K - 1), 6)
    })
  })

  it('returns empty for fewer than 2 distinct points', () => {
    expect(resample([], K)).toEqual([])
    expect(resample([{ x: 5, y: 5 }], K)).toEqual([])
    expect(resample([{ x: 5, y: 5 }, { x: 5, y: 5 }], K)).toEqual([])
    const same = Array.from({ length: 5 }, () => ({ x: 5, y: 5 }))
    expect(resample(same, K)).toEqual([])
  })
})

describe('samplePath (ideal d → K points)', () => {
  const sampled = samplePath(letraC.pathDefinition.d, K)

  it('samples the ideal c path to exactly K arc-length points anchored at its start', () => {
    expect(sampled).toHaveLength(K)
    // The `c` ductus is a CLOSED loop whose first on-curve point is inicio
    // (485.85, 413.16) — and it closes back on itself at the same point.
    expect(sampled[0].x).toBeCloseTo(485.85, 6)
    expect(sampled[0].y).toBeCloseTo(413.16, 6)
    expect(sampled[K - 1].x).toBeCloseTo(485.85, 6)
    expect(sampled[K - 1].y).toBeCloseTo(413.16, 6)
  })

  it('preserves the ductus checkpoint order along the sampled path', () => {
    const indices = letraC.pathDefinition.checkpoints.map((cp) => nearestIndex(sampled, cp))
    expect(indices[0]).toBe(0)
    expect(indices).toEqual([...indices].sort((a, b) => a - b))
    expect(new Set(indices).size).toBe(indices.length)
  })

  it('spaces the sampled ideal evenly along the reference path arc', () => {
    const reference = referenceFlattenPath(letraC.pathDefinition.d)
    const step = arcLength(reference) / (K - 1)
    // The `c` glyph is a closed loop (start == end), so the two ENDPOINTS are
    // geometrically ambiguous for arc-position lookup; assert the interior
    // points are evenly spaced along the true arc.
    const positions = sampled.map((p) => arcPositionOf(reference, p))
    for (let i = 1; i < positions.length - 1; i++) {
      expect(positions[i]).toBeCloseTo(i * step, 3)
    }
  })

  it('returns empty for empty or non-curve path data, throws on unknown tokens', () => {
    expect(samplePath('', K)).toEqual([])
    expect(samplePath('M 5 5', K)).toEqual([])
    expect(() => samplePath('X 1 2', K)).toThrow(/Unexpected path token/)
  })
})