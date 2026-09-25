// Reveal grid contract (reveal-grid spec: Tile Grid Geometry, Erase/Light
// modes, Object Latch, Completion Criteria, Finger Radius, Incremental/
// Whole-Stroke Fold; design.md §1). Node environment, no DOM — every
// scenario here is a synthetic fixture; nothing authors a `reveal` field
// yet (that lands in Phase 4).
import { describe, expect, it } from 'vitest'
import type { Point } from '../letters/types'
import { coverageScore } from './coverage'
import {
  EMPTY_REVEAL,
  REVEAL_EPSILON,
  clearedTiles,
  debugClearedTiles,
  lightOpacity,
  revealScore,
  revealTick,
  revealTiles,
  type RevealGrid,
} from './revealGrid'
import type { RevealConfig } from './types'

/** Sample a parametric curve into a stroke of `n + 1` points. */
function sample(fn: (t: number) => Point, n: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i <= n; i++) out.push(fn(i / n))
  return out
}

const ERASE: Extract<RevealConfig, { mode: 'erase' }> = { mode: 'erase', cols: 10, rows: 6, radius: 110 }

describe('clearedTiles — index convention', () => {
  it('matches coverageScore\'s own cell index for the same row/col (row * cols + col)', () => {
    const grid: RevealGrid = { cols: 12, rows: 8, width: 1000, radius: 0 }
    // A point squarely inside column 5, row 3 of a 12x8 grid over 1000x600.
    const point: Point = { x: 5.5 * (1000 / 12), y: 3.5 * (600 / 8) }
    const visited = clearedTiles([[point]], grid)
    expect(visited.size).toBe(1)
    expect([...visited][0]).toBe(3 * 12 + 5)
  })

  it('grid dimensions come from the level, not a shared constant — differing cols/rows differ in tile count', () => {
    const point: Point = { x: 500, y: 300 }
    const small = clearedTiles([[point]], { cols: 4, rows: 4, width: 1000, radius: 0 })
    const large = clearedTiles([[point]], { cols: 20, rows: 12, width: 1000, radius: 0 })
    expect(small.size).toBe(1)
    expect(large.size).toBe(1)
    expect([...small][0]).not.toBe([...large][0])
  })

  it('the containing tile always clears (radius 0 degrades to point-in-cell)', () => {
    const grid: RevealGrid = { cols: 10, rows: 6, width: 1000, radius: 0 }
    const centre: Point = { x: 50, y: 50 } // tile (0,0) centre, tile is 100x100
    const visited = clearedTiles([[centre]], grid)
    expect(visited.has(0)).toBe(true)
    expect(visited.size).toBe(1)
  })

  it('a sample outside its own cell still clears a neighbour within radius, and NOT one radius + ε away', () => {
    // 10x6 grid over 1000x600: tile 100x100. Tile A = (0,0), centre (50,50).
    const gridRadius50: RevealGrid = { cols: 10, rows: 6, width: 1000, radius: 50 }
    // Exactly `radius` away from A's centre (50, 100) -> boundary inclusive.
    const atRadius: Point = { x: 50, y: 100 }
    const clearsA = clearedTiles([[atRadius]], gridRadius50)
    expect(clearsA.has(0)).toBe(true) // tile A cleared even though the point sits in tile (0,1)

    // One unit further -> radius + ε from A's centre, must NOT clear A.
    const beyondRadius: Point = { x: 50, y: 101 }
    const missesA = clearedTiles([[beyondRadius]], gridRadius50)
    expect(missesA.has(0)).toBe(false)
    // The point's own containing tile still clears either way.
    expect(missesA.has(10)).toBe(true) // tile (0,1), index row(1)*cols(10)+col(0)
  })

  it('radius: 0 reproduces coverageScore\'s visited set exactly, fixture-driven', () => {
    const strokes: Point[][] = [
      sample((t) => ({ x: 500 + 430 * Math.sin(6 * Math.PI * t), y: 300 + 260 * Math.sin(4 * Math.PI * t + 0.7) }), 400),
      [{ x: 20, y: 20 }, { x: 60, y: 60 }],
    ]
    const grid: RevealGrid = { cols: 12, rows: 8, width: 1000, radius: 0 }
    const visited = clearedTiles(strokes, grid)
    const score = Math.round((100 * visited.size) / (12 * 8))
    expect(score).toBe(coverageScore(strokes, 1000))
  })
})

describe('revealTick — incremental fold', () => {
  it('incremental ≡ whole-stroke for window sizes 1..200 over a 200-point stroke', () => {
    const stroke = sample(
      (t) => ({ x: 500 + 400 * Math.sin(5 * 2 * Math.PI * t), y: 300 + 250 * Math.cos(3 * 2 * Math.PI * t) }),
      200,
    )
    const wholeGrid: RevealGrid = { cols: ERASE.cols, rows: ERASE.rows, width: 1000, radius: ERASE.radius }
    const whole = clearedTiles([stroke], wholeGrid)

    for (let windowSize = 1; windowSize <= 200; windowSize++) {
      let state = EMPTY_REVEAL
      for (let i = windowSize; i <= stroke.length; i += windowSize) {
        state = revealTick(state, stroke.slice(0, i), true, ERASE, 1000)
      }
      // Fold the tail, if the stroke length is not a multiple of windowSize.
      state = revealTick(state, stroke, true, ERASE, 1000)
      expect(state.cleared.size, `window ${windowSize}`).toBe(whole.size)
      for (const idx of whole) expect(state.cleared.has(idx), `window ${windowSize} tile ${idx}`).toBe(true)
    }
  })

  it('no segment crosses a pen lift', () => {
    const before = revealTick(EMPTY_REVEAL, [{ x: 10, y: 10 }, { x: 990, y: 590 }], true, ERASE, 1000)
    const lifted = revealTick(before, [], false, ERASE, 1000)
    // A fresh stroke starting far away must not join across the lift.
    const after = revealTick(lifted, [{ x: 500, y: 300 }], true, ERASE, 1000)
    const wholeAsOneStroke = clearedTiles(
      [[{ x: 10, y: 10 }, { x: 990, y: 590 }], [{ x: 500, y: 300 }]],
      { cols: ERASE.cols, rows: ERASE.rows, width: 1000, radius: ERASE.radius },
    )
    expect(after.cleared.size).toBe(wholeAsOneStroke.size)
    expect(lifted.point).toBeNull()
    expect(lifted.seen).toBe(0)
  })

  it('returns the SAME reference when nothing flips', () => {
    const config: Extract<RevealConfig, { mode: 'erase' }> = { mode: 'erase', cols: 10, rows: 6, radius: 5 }
    const state = revealTick(EMPTY_REVEAL, [{ x: 50, y: 50 }], true, config, 1000)
    // A second sample landing in the SAME already-cleared tile changes nothing.
    const again = revealTick(state, [{ x: 50, y: 50 }, { x: 52, y: 52 }], true, config, 1000)
    expect(again).toBe(state)
  })

  it('!drawing is idempotent once already reset', () => {
    const reset = revealTick(EMPTY_REVEAL, [], false, ERASE, 1000)
    expect(reset).toBe(EMPTY_REVEAL)
  })

  describe('light mode', () => {
    const light: Extract<RevealConfig, { mode: 'light' }> = {
      mode: 'light',
      cols: 10,
      rows: 6,
      radius: 100,
      objects: [
        { art: { href: '/art/x.png', w: 1, h: 1 }, size: 50, x: 200, y: 200 },
        { art: { href: '/art/y.png', w: 1, h: 1 }, size: 50, x: 800, y: 400 },
      ],
    }

    it('REVEAL_EPSILON suppresses an idle re-render with no latch change', () => {
      const state = revealTick(EMPTY_REVEAL, [{ x: 500, y: 300 }], true, light, 1000)
      const idle = revealTick(
        state,
        [{ x: 500, y: 300 }, { x: 500 + REVEAL_EPSILON / 2, y: 300 }],
        true,
        light,
        1000,
      )
      expect(idle).toBe(state)
    })

    it('a move beyond REVEAL_EPSILON updates the point', () => {
      const state = revealTick(EMPTY_REVEAL, [{ x: 500, y: 300 }], true, light, 1000)
      const moved = revealTick(
        state,
        [{ x: 500, y: 300 }, { x: 500 + REVEAL_EPSILON * 5, y: 300 }],
        true,
        light,
        1000,
      )
      expect(moved).not.toBe(state)
      expect(moved.point).toEqual({ x: 500 + REVEAL_EPSILON * 5, y: 300 })
    })

    it('an object stays lit after the light moves away — latch ≡ whole-stroke revealScore', () => {
      let state = revealTick(EMPTY_REVEAL, [{ x: 200, y: 200 }], true, light, 1000)
      expect(state.lit.has(0)).toBe(true)
      state = revealTick(state, [{ x: 200, y: 200 }, { x: 900, y: 590 }], true, light, 1000)
      expect(state.lit.has(0)).toBe(true) // still found
      expect(state.lit.has(1)).toBe(false) // never approached

      const finalStrokes = [[{ x: 200, y: 200 }, { x: 900, y: 590 }]]
      expect(revealScore(finalStrokes, { reveal: light }, 1000)).toBe(50)
    })

    it('the light branch requires every object for completion (100 only when all are latched)', () => {
      const strokes = [[{ x: 200, y: 200 }, { x: 800, y: 400 }]]
      expect(revealScore(strokes, { reveal: light }, 1000)).toBe(100)
    })

    it('no active point renders every tile at full covering opacity', () => {
      const tiles = revealTiles(light, EMPTY_REVEAL, 1000)
      expect(tiles.length).toBe(light.cols * light.rows)
      for (const t of tiles) expect(t.opacity).toBe(1)
    })
  })
})

describe('lightOpacity', () => {
  it('is exactly five values, 0 at centre, 1 at and beyond the rim, monotone', () => {
    const radius = 100
    const samples = [0, 25, 50, 75, 100, 150].map((d) => lightOpacity(d, radius))
    expect(new Set([0, 0.25, 0.5, 0.75, 1])).toEqual(new Set([...new Set(samples)]))
    expect(samples[0]).toBe(0)
    expect(samples[4]).toBe(1)
    expect(samples[5]).toBe(1)
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1])
  })
})

describe('revealScore', () => {
  it('erase: the cleared fraction at the level\'s own grid', () => {
    const full: Point[] = []
    for (let row = 0; row < ERASE.rows; row++) {
      for (let col = 0; col < ERASE.cols; col++) {
        full.push({ x: col * (1000 / ERASE.cols) + 5, y: row * (600 / ERASE.rows) + 5 })
      }
    }
    expect(revealScore([full], { reveal: ERASE }, 1000)).toBe(100)
    expect(revealScore([[]], { reveal: ERASE }, 1000)).toBe(0)
  })

  it('no reveal field delegates to coverageScore at its own defaults — f1-libre stays bit-identical', () => {
    const strokes = [sample((t) => ({ x: 500 + 400 * Math.sin(4 * 2 * Math.PI * t), y: 300 }), 300)]
    expect(revealScore(strokes, {}, 1000)).toBe(coverageScore(strokes, 1000))
  })
})

describe('debugClearedTiles', () => {
  it('pre-clears the top round(fraction * rows) tile rows', () => {
    const config: Extract<RevealConfig, { mode: 'erase' }> = { mode: 'erase', cols: 10, rows: 10, radius: 50 }
    const cleared = debugClearedTiles(config, 0.3)
    expect(cleared.size).toBe(3 * 10)
    for (let col = 0; col < 10; col++) {
      expect(cleared.has(0 * 10 + col)).toBe(true)
      expect(cleared.has(2 * 10 + col)).toBe(true)
      expect(cleared.has(3 * 10 + col)).toBe(false)
    }
  })

  it('clamps fraction to [0, 1]', () => {
    const config: Extract<RevealConfig, { mode: 'erase' }> = { mode: 'erase', cols: 4, rows: 4, radius: 10 }
    expect(debugClearedTiles(config, -1).size).toBe(0)
    expect(debugClearedTiles(config, 2).size).toBe(16)
  })
})

describe('revealTiles', () => {
  it('an erase grid with nothing cleared renders every tile at opacity 1', () => {
    const tiles = revealTiles(ERASE, EMPTY_REVEAL, 1000)
    expect(tiles.length).toBe(ERASE.cols * ERASE.rows)
    for (const t of tiles) expect(t.opacity).toBe(1)
  })

  it('a cleared tile is absent from the list', () => {
    const state = revealTick(EMPTY_REVEAL, [{ x: 50, y: 50 }], true, ERASE, 1000)
    const tiles = revealTiles(ERASE, state, 1000)
    expect(tiles.length).toBe(ERASE.cols * ERASE.rows - state.cleared.size)
  })

  // T2 item 3 ("when the child discovers an object, it stays lit — the
  // darkness is permanently removed in a radius around the found object,
  // instead of the light only following the finger").
  describe('light mode — a found object stays lit', () => {
    const light: Extract<RevealConfig, { mode: 'light' }> = {
      mode: 'light',
      cols: 10,
      rows: 6,
      radius: 100,
      objects: [
        { art: { href: '/art/x.png', w: 1, h: 1 }, size: 50, x: 200, y: 200 },
        { art: { href: '/art/y.png', w: 1, h: 1 }, size: 50, x: 800, y: 400 },
      ],
    }

    it('before anything is found, the finger lifting re-covers everything (baseline)', () => {
      // (500, 300) is outside `radius` of both objects — nothing latches.
      const untouched = revealTick(EMPTY_REVEAL, [{ x: 500, y: 300 }], true, light, 1000)
      expect(untouched.lit.size).toBe(0)
      const released = revealTick(untouched, [], false, light, 1000)
      const tiles = revealTiles(light, released, 1000)
      expect(tiles.length).toBe(light.cols * light.rows)
      for (const t of tiles) expect(t.opacity).toBe(1)
    })

    it('once object 0 is found, its own tile stays revealed after the torch lifts', () => {
      let state = revealTick(EMPTY_REVEAL, [{ x: 200, y: 200 }], true, light, 1000)
      expect(state.lit.has(0)).toBe(true)
      state = revealTick(state, [], false, light, 1000) // finger lifts — torch off
      expect(state.point).toBeNull()

      const tiles = revealTiles(light, state, 1000)
      // Tile (2,2) of a 10x6 grid over 1000x600 (tile 100x100): centre
      // (250, 250), 70.7 units from the found object — still lit (opacity
      // below the fully-covering 1) even with no live torch point.
      const nearFound = tiles.find((t) => t.x === 200 && t.y === 200)
      expect(nearFound).toBeDefined()
      expect(nearFound?.opacity).toBeLessThan(1)

      // A tile far from BOTH objects (top-right corner) stays fully dark —
      // the fix lights a radius around what was found, not the whole sheet.
      const farAway = tiles.find((t) => t.x === 900 && t.y === 0)
      expect(farAway?.opacity).toBe(1)
    })

    it('the found object\'s own radius matches the search radius it was found with', () => {
      let state = revealTick(EMPTY_REVEAL, [{ x: 800, y: 400 }], true, light, 1000)
      state = revealTick(state, [], false, light, 1000)
      expect(state.lit.has(1)).toBe(true)

      const tiles = revealTiles(light, state, 1000)
      const at = (x: number, y: number) => tiles.find((t) => t.x === x && t.y === y)?.opacity
      // Exactly `lightOpacity` at each sampled distance from (800, 400):
      // tile (8,4) centre (850, 450) is ~70.7 away, tile (0,0) centre
      // (50, 50) is far past `radius`.
      expect(at(800, 400)).toBeLessThan(1)
      expect(at(0, 0)).toBe(1)
    })
  })
})
