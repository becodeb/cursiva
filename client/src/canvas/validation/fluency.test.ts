// Fluency pillar contract (docs/02 section 5.3).
import { describe, expect, it } from 'vitest'
import type { TracePoint } from '../useTraceInput'
import { fluencyScore } from './fluency'

/** An evenly paced stroke: constant step, constant dt — the ideal movement. */
function evenStroke(n = 40, step = 10, dt = 16, t0 = 0): TracePoint[] {
  return Array.from({ length: n }, (_, i) => ({ x: 100 + i * step, y: 300, t: t0 + i * dt }))
}

/** A stroke drawn in jerks: the step size swings wildly between samples. */
function jerkyStroke(n = 40, dt = 16): TracePoint[] {
  const points: TracePoint[] = []
  let x = 100
  for (let i = 0; i < n; i++) {
    points.push({ x, y: 300, t: i * dt })
    x += i % 2 === 0 ? 1 : 60 // stop-and-lurch
  }
  return points
}

describe('fluencyScore — regularity', () => {
  it('scores a perfectly even stroke high', () => {
    const { fluency, extraLifts } = fluencyScore([evenStroke()], 1)
    expect(fluency).toBeGreaterThanOrEqual(80)
    expect(fluency).toBe(100) // zero variation ⇒ regularity 1
    expect(extraLifts).toBe(0)
  })

  it('scores a jerky stroke much lower — this is a child DRAWING the shape', () => {
    const even = fluencyScore([evenStroke()], 1).fluency
    const jerky = fluencyScore([jerkyStroke()], 1).fluency
    expect(jerky).toBeLessThan(even - 40)
    expect(jerky).toBeLessThan(50)
  })

  it('is speed-independent: the same shape traced slowly scores the same', () => {
    const fast = fluencyScore([evenStroke(40, 10, 8)], 1).fluency
    const slow = fluencyScore([evenStroke(40, 10, 64)], 1).fluency
    expect(fast).toBe(slow)
  })

  it('reads the real timestamps: even spacing at uneven times is NOT fluent', () => {
    // Constant step, wildly varying dt ⇒ the hand hesitated even though the
    // points look evenly spread.
    const hesitant: TracePoint[] = Array.from({ length: 40 }, (_, i) => ({
      x: 100 + i * 10,
      y: 300,
      t: i % 2 === 0 ? i * 8 : i * 8 + 90,
    }))
    expect(fluencyScore([hesitant], 1).fluency).toBeLessThan(
      fluencyScore([evenStroke()], 1).fluency,
    )
  })

  it('ignores zero-length steps instead of reading them as stops', () => {
    const withRepeats: TracePoint[] = []
    for (const p of evenStroke(20)) {
      withRepeats.push(p, { ...p, t: (p.t ?? 0) + 8 }) // duplicated sample
    }
    expect(fluencyScore([withRepeats], 1).fluency).toBe(100)
  })
})

describe('fluencyScore — pen lifts', () => {
  it('counts only the strokes beyond the allowance', () => {
    expect(fluencyScore([evenStroke()], 1).extraLifts).toBe(0)
    expect(fluencyScore([evenStroke(), evenStroke()], 1).extraLifts).toBe(1)
    expect(fluencyScore([evenStroke(), evenStroke(), evenStroke()], 1).extraLifts).toBe(2)
    expect(fluencyScore([evenStroke()], 0).extraLifts).toBe(1)
  })

  it('never counts a lift when the level allows them', () => {
    const strokes = [evenStroke(), evenStroke(), evenStroke()]
    expect(fluencyScore(strokes, strokes.length).extraLifts).toBe(0)
  })

  it('charges exactly 25 points per extra lift', () => {
    const stroke = evenStroke()
    expect(fluencyScore([stroke], 1).fluency).toBe(100)
    expect(fluencyScore([stroke], 0).fluency).toBe(75)
    expect(fluencyScore([stroke], -1).fluency).toBe(50)
    expect(fluencyScore([stroke], -2).fluency).toBe(25)
    expect(fluencyScore([stroke], -3).fluency).toBe(0)
  })

  it('floors at 0 rather than going negative', () => {
    expect(fluencyScore([evenStroke()], -10).fluency).toBe(0)
  })
})

describe('fluencyScore — degenerate input', () => {
  it('returns 0 for no strokes at all', () => {
    expect(fluencyScore([], 1)).toEqual({ fluency: 0, extraLifts: 0 })
  })

  it('returns 0 when every stroke is too short to measure', () => {
    const taps = [
      [{ x: 1, y: 1 }],
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    ]
    expect(fluencyScore(taps, 1)).toEqual({ fluency: 0, extraLifts: 1 })
  })

  it('returns 0 for a stroke that never moved', () => {
    const still: TracePoint[] = Array.from({ length: 10 }, (_, i) => ({ x: 5, y: 5, t: i * 16 }))
    expect(fluencyScore([still], 1).fluency).toBe(0)
  })

  it('still reports extraLifts when the samples are unusable', () => {
    expect(fluencyScore([[{ x: 1, y: 1 }], [{ x: 2, y: 2 }]], 1).extraLifts).toBe(1)
  })
})

describe('fluencyScore — missing timestamps', () => {
  it('does not crash and falls back to spacing regularity', () => {
    const noTime: TracePoint[] = Array.from({ length: 40 }, (_, i) => ({ x: 100 + i * 10, y: 300 }))
    expect(() => fluencyScore([noTime], 1)).not.toThrow()
    expect(fluencyScore([noTime], 1).fluency).toBe(100)
  })

  it('still detects jerkiness from spacing alone', () => {
    const noTimeJerky: TracePoint[] = jerkyStroke().map(({ x, y }) => ({ x, y }))
    expect(fluencyScore([noTimeJerky], 1).fluency).toBeLessThan(50)
  })

  it('tolerates a partially timestamped stroke', () => {
    const mixed: TracePoint[] = evenStroke().map((p, i) => (i % 2 === 0 ? { x: p.x, y: p.y } : p))
    expect(() => fluencyScore([mixed], 1)).not.toThrow()
    expect(fluencyScore([mixed], 1).fluency).toBeGreaterThanOrEqual(0)
  })
})
