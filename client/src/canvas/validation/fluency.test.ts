// Fluency pillar contract (docs/02 section 5.3).
import { describe, expect, it } from 'vitest'
import type { TracePoint } from '../useTraceInput'
import { abruptTurnCount, fluencyScore } from './fluency'

/** An evenly paced stroke: constant step, constant dt — the ideal movement. */
function evenStroke(n = 40, step = 10, dt = 16, t0 = 0): TracePoint[] {
  return Array.from({ length: n }, (_, i) => ({ x: 100 + i * step, y: 300, t: t0 + i * dt }))
}

/** A stroke drawn in jerks, on the time scale of a hand: stops of about a quarter
 *  of a second, each followed by a lurch. (An earlier version alternated step sizes
 *  on every 16 ms event. That is what irregular event delivery looks like, and it
 *  is the very thing `docs/25` P1-1 found scoring the same stroke 32 and 97, so it
 *  stopped being a jerk: see the event-rate tests below.) */
function jerkyStroke(lurches = 10, dt = 16): TracePoint[] {
  const points: TracePoint[] = []
  let x = 100
  let t = 0
  for (let i = 0; i < lurches; i++) {
    for (let k = 0; k < 16; k++) {
      points.push({ x, y: 300, t }) // holding still
      t += dt
    }
    for (let k = 0; k < 6; k++) {
      points.push({ x, y: 300, t })
      x += 14
      t += dt
    }
  }
  return points
}

/** The same line, as a device with some event rate would report it. */
function reported(line: TracePoint[], gaps: readonly number[]): TracePoint[] {
  const totalMs = line[line.length - 1].t ?? 0
  const at = (ms: number): TracePoint => {
    const i = Math.min(line.length - 2, Math.floor((ms / totalMs) * (line.length - 1)))
    const f = (ms / totalMs) * (line.length - 1) - i
    return { x: line[i].x + (line[i + 1].x - line[i].x) * f, y: line[i].y + (line[i + 1].y - line[i].y) * f, t: ms }
  }
  const out: TracePoint[] = []
  let ms = 0
  for (let i = 0; ms < totalMs; i++) {
    out.push(at(ms))
    ms += gaps[i % gaps.length]
  }
  out.push(at(totalMs))
  return out
}

/** A curved line at a steady pace, three seconds long. */
function steadyCurve(): TracePoint[] {
  return Array.from({ length: 188 }, (_, i) => ({
    x: 100 + i * 4,
    y: 300 + Math.sin(i / 18) * 60,
    t: i * 16,
  }))
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

  it('a short rest is a rest, not a failure', () => {
    const rest: TracePoint[] = []
    for (const p of evenStroke(120)) rest.push(p)
    const last = rest[rest.length - 1]
    const paused = rest.map((p, i) => (i < 60 ? p : { ...p, t: (p.t ?? 0) + 300 }))
    expect(last).toBeDefined()
    expect(fluencyScore([paused], 1).fluency).toBeGreaterThanOrEqual(50)
  })

  it('ignores zero-length steps instead of reading them as stops', () => {
    const withRepeats: TracePoint[] = []
    for (const p of evenStroke(20)) {
      withRepeats.push(p, { ...p, t: (p.t ?? 0) + 8 }) // duplicated sample
    }
    expect(fluencyScore([withRepeats], 1).fluency).toBe(100)
  })
})

describe('fluencyScore — the device is not the child (`docs/25` P1-1)', () => {
  const rates: Record<string, readonly number[]> = {
    '60 Hz': [16.7],
    '120 Hz': [8.3],
    '30 Hz with drops': [33, 33, 66, 33, 100, 33],
    'bursty delivery': [4, 4, 40, 4, 4, 60],
  }
  for (const [name, gaps] of Object.entries(rates)) {
    it(`scores one clean stroke within 8 points at ${name}`, () => {
      const base = fluencyScore([steadyCurve()], 1).fluency
      const atRate = fluencyScore([reported(steadyCurve(), gaps)], 1).fluency
      expect(Math.abs(atRate - base)).toBeLessThanOrEqual(8)
      expect(atRate).toBeGreaterThanOrEqual(85)
    })
  }
})

describe('fluencyScore — abrupt direction changes', () => {
  const zigzag = (amplitude: number, wavelength: number): TracePoint[] =>
    Array.from({ length: 400 }, (_, i) => {
      const along = i * 3
      const phase = (along % wavelength) / wavelength
      return { x: 100 + along, y: 300 + amplitude * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase), t: i * 16 }
    })

  it('sinks a zigzag at a perfectly even pace, the case speed alone passed', () => {
    expect(fluencyScore([zigzag(55, 60)], 1).fluency).toBeLessThan(25)
    expect(fluencyScore([zigzag(30, 50)], 1).fluency).toBeLessThan(25)
  })

  it('does not charge a shaky hand: small wobble is not a corner', () => {
    const shaky: TracePoint[] = Array.from({ length: 300 }, (_, i) => ({
      x: 100 + i * 3,
      y: 300 + Math.sin(i / 8) * 8 + Math.sin(i / 2.3) * 1.5,
      t: i * 16,
    }))
    expect(fluencyScore([shaky], 1).fluency).toBeGreaterThanOrEqual(80)
  })

  it('does not charge a corner the model itself has', () => {
    // Up and straight back down, the stem of an `m`.
    const cusp: TracePoint[] = Array.from({ length: 60 }, (_, i) => ({
      x: 300 + (i < 30 ? i : 60 - i) * 0.4,
      y: 400 - (i < 30 ? i : 60 - i) * 4,
      t: i * 16,
    }))
    expect(fluencyScore([cusp], 1).fluency).toBeLessThan(fluencyScore([cusp], 1, { expectedTurns: 1 }).fluency)
    expect(fluencyScore([cusp], 1, { expectedTurns: 1 }).fluency).toBeGreaterThanOrEqual(85)
  })

  it('counts one corner once, however slowly it is drawn', () => {
    const corner = (step: number): TracePoint[] => {
      const out: TracePoint[] = []
      for (let x = 0; x <= 200; x += step) out.push({ x, y: 0 })
      for (let y = step; y <= 200; y += step) out.push({ x: 200, y })
      return out
    }
    expect(abruptTurnCount(corner(10))).toBe(0) // 90 degrees is a curve here
    const hairpin = (step: number): TracePoint[] => {
      const out: TracePoint[] = []
      for (let x = 0; x <= 200; x += step) out.push({ x, y: 0 })
      for (let x = 200 - step; x >= 0; x -= step) out.push({ x, y: 2 })
      return out
    }
    expect(abruptTurnCount(hairpin(2))).toBe(1)
    expect(abruptTurnCount(hairpin(25))).toBe(1)
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
    // No clock: every event counts as one tick, so holding still still reads.
    const noTimeJerky: TracePoint[] = jerkyStroke().map(({ x, y }) => ({ x, y }))
    expect(fluencyScore([noTimeJerky], 1).fluency).toBeLessThan(50)
  })

  it('tolerates a partially timestamped stroke', () => {
    const mixed: TracePoint[] = evenStroke().map((p, i) => (i % 2 === 0 ? { x: p.x, y: p.y } : p))
    expect(() => fluencyScore([mixed], 1)).not.toThrow()
    expect(fluencyScore([mixed], 1).fluency).toBeGreaterThanOrEqual(0)
  })
})
