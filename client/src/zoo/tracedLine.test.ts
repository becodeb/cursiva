import { beforeEach, describe, expect, it } from 'vitest'
import {
  approvedLineFor,
  forgetSessionLines,
  loadTracedLines,
  MAX_TRACED_POINTS,
  smoothStrokePath,
  parseTracedLine,
  recordApprovedStroke,
  saveTracedLine,
  simplifyPoints,
  TRACED_LINES_KEY,
  toTracedLine,
  type StorageLike,
} from './tracedLine'

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('denied')
  },
  setItem: () => {
    throw new Error('quota')
  },
}

/** A hand-drawn wave: a sine with a wobble no model path has. */
const wobblyWave = (n = 400) =>
  Array.from({ length: n }, (_, i) => {
    const x = 90 + (i / (n - 1)) * 820
    return { x, y: 300 + Math.sin(i / 25) * 170 + Math.sin(i * 1.7) * 9 }
  })

describe('toTracedLine', () => {
  it('normalizes to a unit box with the longer side 1, keeping proportions', () => {
    const line = toTracedLine('l', [[{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 200 }]])!
    expect(line.w).toBe(1)
    expect(line.h).toBe(0.5)
    expect(line.strokes[0]).toEqual([[0, 0], [1, 0], [1, 0.5]])
  })

  it('stays within the bound however long the stroke is', () => {
    const line = toTracedLine('l', [wobblyWave(5000), wobblyWave(5000)])!
    const total = line.strokes.reduce((sum, s) => sum + s.length, 0)
    expect(total).toBeLessThanOrEqual(MAX_TRACED_POINTS)
  })

  it('keeps the wobble: the kept line is not the ideal sine', () => {
    const raw = wobblyWave()
    const line = toTracedLine('l', [raw])!
    const ys = raw.map((p) => p.y)
    const span = 820
    const minY = Math.min(...ys)
    // Each kept point is one the finger really passed: it maps back exactly.
    for (const [x, y] of line.strokes[0]) {
      const original = x * span + 90
      const near = raw.reduce((best, p) => (Math.abs(p.x - original) < Math.abs(best.x - original) ? p : best))
      expect(Math.abs((near.y - minY) / span - y)).toBeLessThan(0.02)
    }
    // And its distance from the smooth sine shows the wobble survived.
    let wobble = 0
    for (const [x, y] of line.strokes[0]) {
      const i = (x * span * 399) / 820
      const ideal = (300 + Math.sin(i / 25) * 170 - minY) / span
      wobble = Math.max(wobble, Math.abs(ideal - y))
    }
    expect(wobble).toBeGreaterThan(0.005)
  })

  it('is null for nothing, one dot, or a stationary finger', () => {
    expect(toTracedLine('l', [])).toBeNull()
    expect(toTracedLine('l', [[{ x: 1, y: 1 }]])).toBeNull()
    expect(toTracedLine('l', [[{ x: 1, y: 1 }, { x: 1, y: 1 }]])).toBeNull()
    expect(toTracedLine('l', [[{ x: Number.NaN, y: 1 }, { x: 2, y: 1 }]])).toBeNull()
  })

  it('keeps separate strokes separate (the hedgehog needs each spine)', () => {
    const line = toTracedLine('l', [
      [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      [{ x: 0, y: 20 }, { x: 10, y: 20 }],
    ])!
    expect(line.strokes).toHaveLength(2)
  })
})

describe('simplifyPoints', () => {
  it('drops points on a straight run and keeps the ends and the corner', () => {
    const out = simplifyPoints([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], 0.01)
    expect(out).toEqual([[0, 0], [2, 0], [2, 2]])
  })
})

describe('parseTracedLine', () => {
  const good = { levelId: 'l', w: 1, h: 0.5, strokes: [[[0, 0], [1, 0.5]]] }

  it('accepts a good record', () => {
    expect(parseTracedLine(good)?.levelId).toBe('l')
  })

  it.each([
    ['a string', 'nope'],
    ['an array', []],
    ['no strokes', { ...good, strokes: [] }],
    ['a one-point stroke', { ...good, strokes: [[[0, 0]]] }],
    ['a bad point', { ...good, strokes: [[[0, 0], [1, 'x']]] }],
    ['a size out of range', { ...good, w: 7 }],
    ['more points than a record may hold', { ...good, strokes: [Array.from({ length: MAX_TRACED_POINTS + 1 }, () => [0, 0])] }],
  ])('rejects %s', (_, raw) => {
    expect(parseTracedLine(raw)).toBeNull()
  })
})

describe('persistence', () => {
  beforeEach(() => forgetSessionLines())

  it('round-trips per adventure, without one overwriting another', () => {
    const storage = memoryStorage()
    recordApprovedStroke('duck', 'duck-trail4', [wobblyWave()], storage)
    recordApprovedStroke('bee', 'bee4', [wobblyWave()], storage)
    const all = loadTracedLines(storage)
    expect(all.duck?.levelId).toBe('duck-trail4')
    expect(all.bee?.levelId).toBe('bee4')
  })

  it('stays small: a record is about five kilobytes, room for the real wobble', () => {
    const storage = memoryStorage()
    recordApprovedStroke('duck', 'duck-trail4', [wobblyWave(2000)], storage)
    expect(storage.data[TRACED_LINES_KEY].length).toBeLessThan(6000)
  })

  it('survives corrupt data, dropping only the bad entry', () => {
    expect(loadTracedLines(memoryStorage({ [TRACED_LINES_KEY]: '{not json' }))).toEqual({})
    expect(loadTracedLines(memoryStorage({ [TRACED_LINES_KEY]: '[1,2]' }))).toEqual({})
    const mixed = memoryStorage({
      [TRACED_LINES_KEY]: JSON.stringify({ duck: 'junk', bee: { levelId: 'b', w: 1, h: 1, strokes: [[[0, 0], [1, 1]]] } }),
    })
    const all = loadTracedLines(mixed)
    expect(all.duck).toBeUndefined()
    expect(all.bee?.levelId).toBe('b')
  })

  it('never throws on a storage that throws, and still serves this session', () => {
    expect(loadTracedLines(throwing)).toEqual({})
    expect(() => saveTracedLine('duck', toTracedLine('l', [wobblyWave()])!, throwing)).not.toThrow()
    recordApprovedStroke('duck', 'duck-trail4', [wobblyWave()], throwing)
    expect(approvedLineFor('duck', throwing)?.levelId).toBe('duck-trail4')
  })

  it('reads as no line when there is none: the closing falls back', () => {
    expect(approvedLineFor('duck', memoryStorage())).toBeNull()
    expect(approvedLineFor('duck', null)).toBeNull()
  })

  it('a line kept from an earlier visit still serves', () => {
    const storage = memoryStorage()
    recordApprovedStroke('duck', 'duck-trail4', [wobblyWave()], storage)
    forgetSessionLines()
    expect(approvedLineFor('duck', storage)?.levelId).toBe('duck-trail4')
  })
})

describe('smoothStrokePath', () => {
  const ends = (d: string): number[][] =>
    [...d.matchAll(/(?:M|C[^C]*?\s)(-?[\d.]+) (-?[\d.]+)(?=C|$)/g)].map((m) => [Number(m[1]), Number(m[2])])

  it('goes through every point the finger left, in order', () => {
    const points: [number, number][] = [[10, 10], [40, 12], [55, 60], [120, 58], [121, 20]]
    expect(ends(smoothStrokePath(points))).toEqual(points)
  })

  it('draws curves, not straight facets', () => {
    expect(smoothStrokePath([[0, 0], [50, 40], [100, 0]])).toMatch(/^M0\.0 0\.0C/)
  })

  it('does not overshoot when a long run meets a short one', () => {
    const d = smoothStrokePath([[0, 0], [300, 0], [303, 2], [306, 0]])
    const xs = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]))
    expect(Math.max(...xs)).toBeLessThanOrEqual(306)
    const ys = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Math.abs(Number(m[2])))
    expect(Math.max(...ys)).toBeLessThan(4)
  })

  it('keeps a real reversal where it happened', () => {
    const d = smoothStrokePath([[0, 0], [100, 0], [0, 0]])
    const xs = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]))
    expect(Math.max(...xs)).toBe(100)
  })

  it('says nothing for nothing, and survives a point repeated', () => {
    expect(smoothStrokePath([])).toBe('')
    expect(smoothStrokePath([[5, 5]])).toBe('M5.0 5.0')
    expect(smoothStrokePath([[5, 5], [5, 5], [5, 5]])).not.toContain('NaN')
  })
})

describe('records saved before the line kept more points', () => {
  it('still load, at the old 120-point size', () => {
    const old = { levelId: 'duck-trail4', w: 1, h: 0.4, strokes: [Array.from({ length: 120 }, (_, i) => [i / 119, 0.2])] }
    expect(parseTracedLine(old)?.strokes[0]).toHaveLength(120)
  })
})
