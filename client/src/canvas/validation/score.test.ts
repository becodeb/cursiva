import { describe, expect, it } from 'vitest'
import { letraC } from '../../letters/letra_c'
import type { Point } from '../../letters/types'
import { resample, samplePath } from '../resample'
import { referenceFlattenPath } from '../testUtils'
import { Approval, K, TolPen, TolTouch } from './constants'
import { penScore, score, touchScore } from './score'

function shifted(points: Point[], dx: number, dy: number): Point[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

function tracedDensePath(dy: number): Point[] {
  // A user stroke drawn over the ideal path: dense reference polyline
  // (optionally shifted), run through the real capture→resample pipeline.
  const dense = referenceFlattenPath(letraC.pathDefinition.d)
  return resample(dy === 0 ? dense : shifted(dense, 0, dy), K)
}

describe('score (docs/02 formula with mandatory ×100 factor)', () => {
  const ideal = samplePath(letraC.pathDefinition.d, K)

  it('scores a perfect overlap exactly 100', () => {
    expect(score(ideal, ideal, TolTouch)).toBe(100)
    expect(score(ideal, ideal, TolPen)).toBe(100)
  })

  it('scores a perfect overlap 100 through the capture→resample pipeline', () => {
    const user = tracedDensePath(0)
    expect(score(user, ideal, TolTouch)).toBeGreaterThanOrEqual(99.9)
  })

  it('touch 5px mean deviation scores 72.2 ≥ 70 (approved) — ×100 factor', () => {
    // Already-paired K-arrays (the evaluator contract): per-pair distance 5.
    const user = shifted(ideal, 0, 5)

    expect(touchScore(user, ideal)).toBeGreaterThanOrEqual(Approval)
    expect(touchScore(user, ideal)).toBeCloseTo(72.2, 1)
    // Design.md cross-check: Σdist = 64·5 = 320 → 100 − 100·320/(64·18) = 72.2
    expect(score(user, ideal, TolTouch)).toBeCloseTo(100 - (100 * (K * 5)) / (K * TolTouch), 1)
  })

  it('pen 5px mean deviation scores 58.3 < 70 (rejected) and lower than touch — ×100 factor', () => {
    const user = shifted(ideal, 0, 5)

    expect(penScore(user, ideal)).toBeLessThan(Approval)
    expect(penScore(user, ideal)).toBeCloseTo(58.3, 1)
    expect(penScore(user, ideal)).toBeLessThan(touchScore(user, ideal))
    // Design.md cross-check: 100 − 100·320/(64·12) = 58.3
    expect(score(user, ideal, TolPen)).toBeCloseTo(100 - (100 * (K * 5)) / (K * TolPen), 1)
  })

  it('keeps the 72.2/58.3 verdicts through the capture→resample pipeline', () => {
    const user = tracedDensePath(5)
    expect(touchScore(user, ideal)).toBeGreaterThanOrEqual(Approval)
    expect(penScore(user, ideal)).toBeLessThan(Approval)
    expect(penScore(user, ideal)).toBeLessThan(touchScore(user, ideal))
  })

  it('clamps far-off traces to 0', () => {
    const user = shifted(ideal, 0, 1000)
    expect(score(user, ideal, TolTouch)).toBe(0)
  })

  it('returns 0 for degenerate (empty) input — never an approval', () => {
    expect(score([], ideal, TolTouch)).toBe(0)
    expect(score(ideal, [], TolTouch)).toBe(0)
    expect(score([], [], TolTouch)).toBe(0)
    expect(touchScore([], ideal)).toBe(0)
  })

  it('pairs index-wise even when one side is shorter (defensive min-length)', () => {
    expect(score(ideal.slice(0, 10), ideal, TolTouch)).toBe(100)
  })
})