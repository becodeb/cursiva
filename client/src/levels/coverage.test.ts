// Coverage contract for the free warm-up level (docs/08 section 5).
//
// The threshold is not a taste call, it is a measurement, so the fixtures here
// are the measurement: a lazy gesture and an energetic one, scored the way the
// engine scores them. If a future retune moves the grid, these numbers move
// with it and the level's `minAccuracy` has to be revisited.
import { describe, expect, it } from 'vitest'
import type { Point } from '../letters/types'
import { getLevel } from './catalog'
import { COVERAGE_COLUMNS, COVERAGE_ROWS, coverageScore } from './coverage'

/** Sample a parametric curve into a stroke of `n + 1` points. */
function sample(fn: (t: number) => Point, n: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i <= n; i++) out.push(fn(i / n))
  return out
}

/** A child filling the sheet: a big 3:2 figure sweeping the whole paper. */
function energeticScribble(): Point[] {
  return sample(
    (t) => ({
      x: 500 + 430 * Math.sin(3 * 2 * Math.PI * t),
      y: 300 + 260 * Math.sin(2 * 2 * Math.PI * t + 0.7),
    }),
    600,
  )
}

describe('coverageScore — the sheet, not the ink', () => {
  it('scores nothing for no strokes at all', () => {
    expect(coverageScore([], 1000)).toBe(0)
    expect(coverageScore([[]], 1000)).toBe(0)
  })

  it('scores a single cell for a single point', () => {
    // 1 of 96 cells → 1.04 % → 1.
    expect(coverageScore([[{ x: 500, y: 300 }]], 1000)).toBe(1)
  })

  it('scores 100 only when every cell was visited', () => {
    const full: Point[] = []
    for (let row = 0; row < COVERAGE_ROWS; row++) {
      for (let column = 0; column < COVERAGE_COLUMNS; column++) {
        full.push({ x: column * (1000 / COVERAGE_COLUMNS) + 40, y: row * 75 + 37 })
      }
    }
    expect(coverageScore([full], 1000)).toBe(100)
  })

  it('joins consecutive samples — a fast swipe does not lose the cells it crossed', () => {
    // Two points 880 units apart: reporting only the endpoints would score 2
    // cells, but the finger physically crossed the whole row.
    const swipe = coverageScore([[{ x: 60, y: 300 }, { x: 940, y: 300 }]], 1000)
    expect(swipe).toBe(Math.round((100 * COVERAGE_COLUMNS) / (COVERAGE_COLUMNS * COVERAGE_ROWS)))
  })

  it('does NOT join across a pen lift — the gap was never drawn', () => {
    const topLeft: Point[] = [{ x: 20, y: 20 }, { x: 60, y: 60 }]
    const bottomRight: Point[] = [{ x: 940, y: 540 }, { x: 980, y: 580 }]
    // Both dabs fit inside one cell each: two corners, nothing in between.
    expect(coverageScore([topLeft, bottomRight], 1000)).toBe(2)
    // The same four points as ONE stroke sweeps the diagonal between them.
    expect(coverageScore([[...topLeft, ...bottomRight]], 1000)).toBeGreaterThan(10)
  })

  it('counts REACH, not ink: a dense corner scribble stays low', () => {
    // This is the failure mode a fine grid would reward — scribbling one corner
    // black without the arm ever leaving it.
    const corner = sample(
      (t) => ({ x: 120 + 180 * Math.sin(20 * Math.PI * t), y: 120 + 120 * t }),
      400,
    )
    expect(coverageScore([corner], 1000)).toBeLessThan(20)
  })

  it('clamps a stroke that runs off the paper instead of dropping it', () => {
    const offSheet = coverageScore([[{ x: -400, y: -200 }, { x: 1400, y: 900 }]], 1000)
    expect(offSheet).toBeGreaterThan(0)
    expect(offSheet).toBeLessThanOrEqual(100)
  })

  it('follows the level sheet width — a wider sheet needs a wider reach', () => {
    const stroke = [{ x: 60, y: 300 }, { x: 940, y: 300 }]
    // The same stroke covers a smaller FRACTION of a wider sheet.
    expect(coverageScore([stroke], 1400)).toBeLessThan(coverageScore([stroke], 1000))
  })
})

describe('coverageScore — the f1-libre threshold', () => {
  const threshold = getLevel('f1-libre').rules.minAccuracy

  it('passes a child who scribbles energetically over the whole sheet', () => {
    expect(coverageScore([energeticScribble()], 1000)).toBeGreaterThanOrEqual(threshold)
  })

  it('passes three big separate sweeps — lifting the finger is allowed here', () => {
    const band = (y: number): Point[] =>
      sample((t) => ({ x: 60 + 880 * t, y: y + 60 * Math.sin(6 * Math.PI * t) }), 200)
    expect(coverageScore([band(100), band(300), band(500)], 1000)).toBeGreaterThanOrEqual(
      threshold,
    )
  })

  it('fails a single short line', () => {
    expect(coverageScore([[{ x: 200, y: 300 }, { x: 420, y: 300 }]], 1000)).toBeLessThan(
      threshold,
    )
  })

  it('fails one big diagonal — crossing the sheet once is not covering it', () => {
    expect(coverageScore([[{ x: 60, y: 540 }, { x: 940, y: 60 }]], 1000)).toBeLessThan(threshold)
  })
})
