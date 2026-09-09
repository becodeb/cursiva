// Tapering corridor geometry. The contract is: the emitted pieces cover the
// same route as the original path, in order, with widths interpolating from
// `taper.from × width` to `taper.to × width` across the WHOLE route.
import { describe, expect, it } from 'vitest'
import { TAPER_SEGMENTS, taperedCorridor } from './corridorTaper'

// `flattenPathD` treats a path of fewer than 3 points as degenerate, and every
// authored level path is subdivided well past that (`levels/paths.ts`), so the
// fixtures are subdivided too.
const LINE = 'M 100 300 L 500 300 L 900 300'

describe('taperedCorridor (LevelConfig.taper)', () => {
  it('narrows monotonically from the first piece to the last', () => {
    const pieces = taperedCorridor([LINE], 100, { from: 1, to: 0.5 })
    expect(pieces.length).toBeGreaterThan(1)
    for (let i = 1; i < pieces.length; i++) {
      expect(pieces[i].width).toBeLessThan(pieces[i - 1].width)
    }
    // Widths are sampled at each piece's arc MIDPOINT, so the extremes sit half
    // a piece inside the nominal 100 → 50 range rather than exactly on it.
    expect(pieces[0].width).toBeLessThan(100)
    expect(pieces[0].width).toBeGreaterThan(98)
    expect(pieces[pieces.length - 1].width).toBeGreaterThan(50)
    expect(pieces[pieces.length - 1].width).toBeLessThan(52)
  })

  it('widens when the taper runs the other way', () => {
    const pieces = taperedCorridor([LINE], 100, { from: 0.5, to: 1 })
    for (let i = 1; i < pieces.length; i++) {
      expect(pieces[i].width).toBeGreaterThan(pieces[i - 1].width)
    }
  })

  it('a from===to taper is a constant-width chain (still a valid corridor)', () => {
    const pieces = taperedCorridor([LINE], 80, { from: 1, to: 1 })
    for (const piece of pieces) expect(piece.width).toBeCloseTo(80, 6)
  })

  it('emits about TAPER_SEGMENTS pieces and honours an explicit count', () => {
    expect(taperedCorridor([LINE], 100, { from: 1, to: 0.5 })).toHaveLength(TAPER_SEGMENTS)
    expect(taperedCorridor([LINE], 100, { from: 1, to: 0.5 }, 8)).toHaveLength(8)
  })

  it('pieces are contiguous: each one starts where the previous one ended', () => {
    const pieces = taperedCorridor([LINE], 100, { from: 1, to: 0.4 }, 10)
    for (let i = 1; i < pieces.length; i++) {
      const prevEnd = pieces[i - 1].d.split('L').pop()!.trim()
      const nextStart = pieces[i].d.slice(2, pieces[i].d.indexOf('L')).trim()
      expect(nextStart).toBe(prevEnd)
    }
  })

  it('spans the whole route: first point is the path start, last is its end', () => {
    const pieces = taperedCorridor([LINE], 100, { from: 1, to: 0.5 }, 4)
    expect(pieces[0].d.startsWith('M 100 300')).toBe(true)
    expect(pieces[pieces.length - 1].d.endsWith('900 300')).toBe(true)
  })

  it('keeps the original vertices of a curve instead of flattening it to chords', () => {
    // A zigzag whose corner would vanish if each piece were resampled to a
    // straight chord between its endpoints.
    const zig = 'M 0 300 L 100 100 L 200 300 L 300 100 L 400 300'
    const pieces = taperedCorridor([zig], 60, { from: 1, to: 0.6 }, 4)
    const corners = pieces.filter((p) => p.d.split('L').length > 2)
    expect(corners.length).toBeGreaterThan(0)
  })

  it('tapers ACROSS pen lifts: a second path continues where the first stopped', () => {
    const pieces = taperedCorridor(
      ['M 0 300 L 200 300 L 400 300', 'M 600 300 L 800 300 L 1000 300'],
      100,
      { from: 1, to: 0 },
      8,
    )
    for (let i = 1; i < pieces.length; i++) {
      expect(pieces[i].width).toBeLessThan(pieces[i - 1].width)
    }
  })

  it('never draws the jump BETWEEN two subpaths of one d string', () => {
    // The gap 400→600 is a pen lift; no emitted piece may cross it.
    const pieces = taperedCorridor(['M 0 300 L 200 300 L 400 300 M 600 300 L 800 300 L 1000 300'], 50, {
      from: 1,
      to: 0.5,
    })
    for (const piece of pieces) {
      const xs = [...piece.d.matchAll(/-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/g)].map((m) =>
        Number(m[0].split(/\s+/)[0]),
      )
      const crosses = Math.min(...xs) < 400 && Math.max(...xs) > 600
      expect(crosses).toBe(false)
    }
  })

  it('returns [] for a degenerate route, so the caller falls back to one stroke', () => {
    expect(taperedCorridor([], 100, { from: 1, to: 0.5 })).toEqual([])
    expect(taperedCorridor([''], 100, { from: 1, to: 0.5 })).toEqual([])
    expect(taperedCorridor(['M 10 10'], 100, { from: 1, to: 0.5 })).toEqual([])
  })
})
