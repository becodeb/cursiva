import { describe, expect, it } from 'vitest'
import type { Point } from '../../letters/types'
import { Approval, AREA_GRACE, TolPen, TolTouch } from './constants'
import { penScore, score, touchScore } from './score'

// Synthetic ideal: the letter AREA as a dense band around y=300, x∈[100,900],
// half-width 18px (≈36px stroke, matching the real Kalam glyph body). The y
// grid is dense (step 1) and the trace x-grid aligns to the cloud x-grid (step
// 4) so a trace point at vertical offset `dy` sits exactly `|dy|−18` px from
// the nearest cloud point — keeping the tolerance math exact.
const ideal: Array<[number, number]> = []
for (let x = 100; x <= 900; x += 4) {
  for (let y = 282; y <= 318; y += 1) ideal.push([x, y])
}

// A horizontal trace whose x-grid matches the cloud; at vertical offset `dy`
// from the band center (300) the nearest cloud point is `|dy| − 18` px away.
function lineAt(dy: number): Point[] {
  const pts: Point[] = []
  for (let x = 100; x <= 900; x += 4) pts.push({ x, y: 300 + dy })
  return pts
}

describe('score (area-cloud model)', () => {
  it('scores a perfect on-area trace exactly 100', () => {
    expect(score(lineAt(0), ideal, TolTouch)).toBe(100)
    expect(score(lineAt(0), ideal, TolPen)).toBe(100)
  })

  it('pen: 5px outside the area → 87.5 = 100 − 100·(5−3)/16', () => {
    const user = lineAt(23) // |23| − 18 = 5px outside the band
    expect(penScore(user, ideal)).toBeCloseTo(87.5, 1)
  })

  it('pen: 8px outside the area → 68.75 < 70 (rejected)', () => {
    const user = lineAt(26) // 8px outside
    expect(penScore(user, ideal)).toBeCloseTo(68.75, 1)
    expect(penScore(user, ideal)).toBeLessThan(Approval)
  })

  it('touch: 5px outside the area → 92.3 = 100 − 100·(5−3)/26 (approved)', () => {
    const user = lineAt(23)
    expect(touchScore(user, ideal)).toBeCloseTo(92.3, 1)
    expect(touchScore(user, ideal)).toBeGreaterThanOrEqual(Approval)
  })

  it('touch: 8px outside the area → 80.8 ≥ 70 (approved); pen would fail the same trace', () => {
    const user = lineAt(26) // 8px outside
    expect(touchScore(user, ideal)).toBeCloseTo(80.8, 1)
    expect(touchScore(user, ideal)).toBeGreaterThanOrEqual(Approval)
    expect(penScore(user, ideal)).toBeLessThan(Approval)
  })

  it('touch: 20px outside the area → 34.6 = 100 − 100·(20−3)/26', () => {
    const user = lineAt(38) // 20px outside
    expect(touchScore(user, ideal)).toBeCloseTo(34.6, 1)
  })

  it('clamps a far-off trace to 0', () => {
    expect(score(lineAt(1000), ideal, TolTouch)).toBe(0)
  })

  it('dead zone: a 3px-off trace still scores 100 (AREA_GRACE absorbs it)', () => {
    expect(penScore(lineAt(18 + AREA_GRACE), ideal)).toBe(100)
  })

  it('returns 0 for degenerate (empty) input — never an approval', () => {
    expect(score([], ideal, TolTouch)).toBe(0)
    expect(score(lineAt(0), [], TolTouch)).toBe(0)
    expect(score([], [], TolTouch)).toBe(0)
    expect(touchScore([], ideal)).toBe(0)
  })
})
