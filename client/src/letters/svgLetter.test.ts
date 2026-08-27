import { afterEach, describe, expect, it, vi } from 'vitest'
import { letraA } from './letra_a'
import { resample, samplePath } from '../canvas/resample'
import {
  BASELINE_Y,
  MIDDLE_LINE_Y,
  TOP_LINE_Y,
  LETTER_ZONES,
  adjustToRuledZone,
  buildLetterConfig,
  extractPathD,
  flattenPathD,
  generateCheckpoints,
  loadSvgLetters,
  pathFromPoints,
  pointAtArcLength,
  polylineLength,
  reorderForWriting,
  resolveBaselineZone,
  transformPathD,
} from './svgLetter'
import type { LetterCheckpoint, Point } from './types'

/**
 * Cumulative arc positions of the checkpoints along a dense reference polyline,
 * found by a MONOTONIC FORWARD search (so a closed-loop path whose start equals
 * its end is walked forward to the true end index, not wrapped back to 0).
 * Returns [0, s1, s2, ...] in arc length from the path start.
 */
function cumulativeArcPositions(dense: Point[], cps: LetterCheckpoint[]): number[] {
  let idx = 0
  const positions: number[] = [0]
  for (let k = 1; k < cps.length; k++) {
    const c = cps[k]
    let best = idx
    let bestDist = Infinity
    for (let j = idx; j < dense.length; j++) {
      const dd = Math.hypot(dense[j].x - c.x, dense[j].y - c.y)
      if (dd < bestDist) {
        bestDist = dd
        best = j
      }
    }
    let g = 0
    for (let j = idx + 1; j <= best; j++) {
      g += Math.hypot(dense[j].x - dense[j - 1].x, dense[j].y - dense[j - 1].y)
    }
    positions.push(positions[positions.length - 1] + g)
    idx = best
  }
  return positions
}

/** Bounding box of a path `d` (dense sample) in the final viewBox space. */
function bboxOf(d: string): {
  top: number
  bottom: number
  centerX: number
} {
  const pts = samplePath(d, 1000)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { top: minY, bottom: maxY, centerX: (minX + maxX) / 2 }
}

/** Eager Vite glob of the hand-drawn SVGs, reusing the same loader the app
 * uses — so the test reads the REAL `a.svg` from disk (not a copy-pasted
 * literal) and tracks the file the author actually ships. */
const svgRawModules = import.meta.glob('./svg/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function realAD(): string {
  const raw = svgRawModules['./svg/a.svg']
  if (!raw) throw new Error('a.svg no encontrado en la carpeta svg/')
  const d = extractPathD(raw)
  if (!d) throw new Error('a.svg no contiene un <path> utilizable')
  return d
}

describe('extractPathD', () => {
  it('grabs d from a path with attributes before and after, double quotes', () => {
    const svg = '<svg><path fill="none" d="M10 20 Q30 5 50 20" stroke="black"/></svg>'
    expect(extractPathD(svg)).toBe('M10 20 Q30 5 50 20')
  })

  it('handles single quotes', () => {
    const svg = "<path d='M0 0 L100 100' />"
    expect(extractPathD(svg)).toBe('M0 0 L100 100')
  })

  it('takes the first path even when nested in <g>', () => {
    const svg =
      '<svg viewBox="0 0 1000 600"><g transform="scale(2)"><path d="M1 1 L2 2"/><path d="M9 9 L8 8"/></g></svg>'
    expect(extractPathD(svg)).toBe('M1 1 L2 2')
  })

  it('returns null when there is no path', () => {
    expect(extractPathD('<svg><rect x="0" y="0" width="10" height="10"/></svg>')).toBeNull()
    expect(extractPathD('')).toBeNull()
  })
})

describe('letter zones', () => {
  it('classifies media/alta/baja/mixta and defaults unknown to media', () => {
    expect(resolveBaselineZone('a')).toBe('media')
    expect(resolveBaselineZone('b')).toBe('alta')
    expect(resolveBaselineZone('g')).toBe('baja')
    expect(resolveBaselineZone('j')).toBe('mixta')
    expect(resolveBaselineZone('Z')).toBe('media')
    expect(resolveBaselineZone('?')).toBe('media')
  })

  it('LETTER_ZONES is the union of the zone char groups', () => {
    const keys = Object.keys(LETTER_ZONES)
    expect(keys.length).toBeGreaterThanOrEqual(26)
    for (const c of 'aceimnorstuvwxz') expect(LETTER_ZONES[c]).toBe('media')
    for (const c of 'bdfhkl') expect(LETTER_ZONES[c]).toBe('alta')
    for (const c of 'gpqy') expect(LETTER_ZONES[c]).toBe('baja')
    expect(LETTER_ZONES['j']).toBe('mixta')
  })
})

describe('adjustToRuledZone', () => {
  it('fits a known box to the media zone (baseline 420, middle 300, centered x=500)', () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 50, y: 100 },
      { x: 50, y: 0 },
    ]
    const fit = adjustToRuledZone(pts, 'media')
    // Uniform scale: targetH=120 over bboxH=100 → 1.2
    expect(fit.scaleX).toBeCloseTo(1.2, 5)
    expect(fit.scaleY).toBeCloseTo(1.2, 5)
    const ys = fit.points.map((p) => p.y)
    const xs = fit.points.map((p) => p.x)
    expect(Math.max(...ys)).toBeCloseTo(420, 1)
    expect(Math.min(...ys)).toBeCloseTo(300, 1)
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(500, 1)
  })
})

describe('transformPathD', () => {
  it('transforms M/L/C/Q/Z preserving structure, curves kept', () => {
    const d = 'M10 10 L20 20 C30 0 40 0 50 50 Q60 60 70 70 Z'
    const out = transformPathD(d, 2, 2, 5, 5)
    // Parse back: M 25 25 (10*2+5,10*2+5) L 45 45 ...
    expect(out).toContain('M 25 25')
    expect(out).toContain('L 45 45')
    expect(out).toContain('C')
    expect(out).toContain('Q')
    expect(out.endsWith('Z')).toBe(true)
  })

  it('rounds coordinates to 2 decimals', () => {
    const out = transformPathD('M1.23456 2.98765', 1, 1, 0, 0)
    expect(out).toBe('M 1.23 2.99')
  })
})

describe('generateCheckpoints', () => {
  const d = letraA.pathDefinition.d

  it('produces strictly increasing orders 1..N', () => {
    const sampled = samplePath(d, 400)
    const cps = generateCheckpoints(sampled, polylineLength(sampled))
    const orders = cps.map((c) => c.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(orders[0]).toBe(1)
    expect(orders[orders.length - 1]).toBe(orders.length)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('spaces checkpoints uniformly in ARC LENGTH (gaps within ±1%)', () => {
    const sampled = samplePath(d, 400)
    const cps = generateCheckpoints(sampled, polylineLength(sampled))
    // Independent dense ground truth, not the 400-sample used to build.
    const dense = samplePath(d, 2000)
    const positions = cumulativeArcPositions(dense, cps)
    const gaps = positions.slice(1).map((s, i) => s - positions[i])
    const min = Math.min(...gaps)
    const max = Math.max(...gaps)
    expect(max / min).toBeLessThanOrEqual(1.01)
  })

  it('keeps every radius inside [35, 60]', () => {
    const sampled = samplePath(d, 400)
    const cps = generateCheckpoints(sampled, polylineLength(sampled))
    for (const c of cps) {
      expect(c.radius).toBeGreaterThanOrEqual(35)
      expect(c.radius).toBeLessThanOrEqual(60)
    }
  })

  it('places each checkpoint exactly on the path at its arc fraction', () => {
    const sampled = samplePath(d, 400)
    const total = polylineLength(sampled)
    const cps = generateCheckpoints(sampled, total)
    const N = cps.length
    cps.forEach((c, i) => {
      const expected = pointAtArcLength(sampled, (i / (N - 1)) * total)
      expect(Math.hypot(c.x - expected.x, c.y - expected.y)).toBeLessThan(0.5)
    })
  })
})

describe('buildLetterConfig normalization', () => {
  const simple = 'M0 0 L0 100 L50 100 L50 0 Z' // bbox x[0,50] y[0,100]

  it("media zone ('a') rests on baseline 420, tops at middle 300, centered x=500", () => {
    const cfg = buildLetterConfig('a', simple)
    expect(cfg.baselineZone).toBe('media')
    expect(cfg.family).toBe('ola')
    const bb = bboxOf(cfg.pathDefinition.d)
    expect(bb.bottom).toBeCloseTo(BASELINE_Y, 0)
    expect(bb.top).toBeCloseTo(MIDDLE_LINE_Y, 0)
    expect(bb.centerX).toBeCloseTo(500, 0)
  })

  it("alta zone ('b') rests on baseline 420, tops at top line 180", () => {
    const cfg = buildLetterConfig('b', simple)
    expect(cfg.baselineZone).toBe('alta')
    const bb = bboxOf(cfg.pathDefinition.d)
    expect(bb.bottom).toBeCloseTo(BASELINE_Y, 0)
    expect(bb.top).toBeCloseTo(TOP_LINE_Y, 0)
    expect(bb.centerX).toBeCloseTo(500, 0)
  })

  it('builds a complete config with the expected envelope (normalized d)', () => {
    const d = letraA.pathDefinition.d
    const cfg = buildLetterConfig('a', d)
    expect(cfg.id).toBe('letra_a')
    expect(cfg.character).toBe('a')
    expect(cfg.family).toBe('ola')
    expect(cfg.baselineZone).toBe('media')
    // The stored d is now the NORMALIZED path, not the raw input.
    expect(cfg.pathDefinition.d).not.toBe(d)
    expect(cfg.pathDefinition.d.length).toBeGreaterThan(0)
    expect(cfg.pathDefinition.guideD).toBeUndefined()
    expect(cfg.pathDefinition.strokeWidth).toBe(14)
  })

  it('emits ~1800 ideal points with a ±8px perpendicular band (±10%)', () => {
    const cfg = buildLetterConfig('a', simple)
    expect(cfg.pathDefinition.ideal.length).toBeGreaterThanOrEqual(1620)
    expect(cfg.pathDefinition.ideal.length).toBeLessThanOrEqual(1980)
    for (const [x, y] of cfg.pathDefinition.ideal) {
      expect(Number.isFinite(x)).toBe(true)
      expect(Number.isFinite(y)).toBe(true)
    }
  })

  it('orders checkpoints 1..N and keeps a draw_path step in the timeline', () => {
    const cfg = buildLetterConfig('a', simple)
    const orders = cfg.pathDefinition.checkpoints.map((c) => c.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(orders[0]).toBe(1)
    expect(orders[orders.length - 1]).toBe(orders.length)
    const types = cfg.animationTimeline.map((s) => s.type)
    expect(types).toContain('draw_path')
    expect(types).toEqual(['slide_in', 'draw_path', 'fade_out'])
  })

  it('regression: a small-viewBox Figma SVG is scaled up into the viewBox, not left tiny in a corner', () => {
    // Mirrors the user's bug: Figma exports a.svg with viewBox 0 0 154 54, so the
    // raw path lives in that tiny space. Normalization must lift it onto the
    // ruled line inside 0 0 1000 600.
    const bugSvg =
      '<svg width="154" height="54" viewBox="0 0 154 54" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M10 5 L10 45 L30 45 L30 5 Z" stroke="#FF0000"/></svg>'
    const d = extractPathD(bugSvg)
    expect(d).not.toBeNull()
    const cfg = buildLetterConfig('a', d as string)
    const bb = bboxOf(cfg.pathDefinition.d)
    expect(bb.bottom).toBeCloseTo(BASELINE_Y, 0)
    expect(bb.top).toBeCloseTo(MIDDLE_LINE_Y, 0)
    expect(bb.centerX).toBeGreaterThan(300)
    expect(bb.centerX).toBeLessThan(700)
  })
})

describe('flattenPathD / reorderForWriting', () => {
  // Regression for the real Inkscape a.svg: a single `c` command carries MANY
  // implicit cubic segments (the command letter is not repeated). The buggy
  // flatten discarded every number after the first segment, yielding 49 points
  // and rendering a stunted curve. After the fix it is ONE subpath with >200
  // dense points.
  it('the real a.svg (Inkscape single subpath) flattens to ONE subpath and >200 points', () => {
    const flat = flattenPathD(realAD())
    expect(flat.starts.length).toBe(1)
    expect(flat.points.length).toBeGreaterThan(200)
  })

  // A Figma-style export with TWO disconnected subpaths (a fixture, kept
  // independent of the real a.svg so this coverage survives file swaps).
  const FIGMA_TWO_SUBPATHS =
    'M10 10 L90 10 L90 90 L10 90 Z M300 10 L380 10 L380 90 L300 90 Z'

  it('reorderForWriting keeps the file order (no inversion) and reports gaps for a 2-subpath fixture', () => {
    const flat = flattenPathD(FIGMA_TWO_SUBPATHS)
    expect(flat.starts.length).toBe(2)
    const { points: ordered, hasGaps } = reorderForWriting(flat.points, flat.starts)
    // The path order is the author's word: the first result point is the first
    // point of the first subpath, NOT the lower-left endpoint that the old
    // greedy rewriter used to invert toward.
    expect(ordered[0]).toEqual(flat.points[0])
    // The two subpaths are disconnected by a large jump → gap detected.
    expect(hasGaps).toBe(true)
  })

  it('flattens an empty / M-less path to empty (contract guard)', () => {
    expect(flattenPathD('')).toEqual({ points: [], starts: [] })
    expect(flattenPathD('L10 10 L20 20')).toEqual({ points: [], starts: [] })
  })

  it('pathFromPoints emits an M/L polyline', () => {
    const d = pathFromPoints([{ x: 1.23456, y: 2.98765 }, { x: 3, y: 4 }])
    expect(d.startsWith('M 1.23 2.99')).toBe(true)
    expect(d).toContain('L 3 4')
  })
})

describe('reorderForWriting — single subpath (no rotation, no cut, no inversion)', () => {
  // Anticlockwise oval: M top, curve down the left, across the bottom, up the
  // right, back to the top. Drawn so the traversal is anticlockwise. The first
  // node is at the TOP, so a heuristic that anchored checkpoint 1 to the
  // lower-left would have been wrong here — the author's order is the truth.
  const ANTICLOCKWISE_OVAL =
    'M400 200 C300 200 200 300 200 400 C200 500 300 600 400 600 C500 600 600 500 600 400 C600 300 500 200 400 200'

  it('returns the SAME polyline (points[i] identical, hasGaps false) for any single subpath', () => {
    const flat = flattenPathD(ANTICLOCKWISE_OVAL)
    const { points: ordered, hasGaps } = reorderForWriting(flat.points, flat.starts)
    expect(hasGaps).toBe(false)
    // The author's path order is the writing order: returned verbatim.
    expect(ordered).toEqual(flat.points)
  })

  it('does NOT invert traversal direction: an anticlockwise oval stays anticlockwise', () => {
    const flat = flattenPathD(ANTICLOCKWISE_OVAL)
    const { points: ordered } = reorderForWriting(flat.points, flat.starts)
    // Identity means the sequence of points is untouched; reversing would flip
    // the sense. Assert every point is preserved in original order.
    expect(ordered.length).toBe(flat.points.length)
    for (let i = 0; i < flat.points.length; i++) {
      expect(ordered[i]).toEqual(flat.points[i])
    }
  })

  it("buildLetterConfig('o', oval) puts checkpoint 1 where the PATH starts (author order), not at a lower-left heuristic", () => {
    // The oval's first node (400,200) is at the TOP, so checkpoint 1 must land
    // at the normalized start — this proves we no longer rotate/cut to anchor
    // it to the lower-left corner.
    const flat = flattenPathD(ANTICLOCKWISE_OVAL)
    const { points: ordered } = reorderForWriting(flat.points, flat.starts)
    const resampled = resample(ordered, 500)
    const fitted = adjustToRuledZone(resampled, 'media')
    const start = fitted.points[0]
    const cfg = buildLetterConfig('o', ANTICLOCKWISE_OVAL)
    const first = cfg.pathDefinition.checkpoints[0]
    expect(Math.hypot(first.x - start.x, first.y - start.y)).toBeLessThan(1)
  })
})

describe('reorderForWriting — ideal single-subpath export (the authoring guide)', () => {
  // A cleanly exported letter: ONE subpath, starts at the lower-left, rises,
  // crests, returns low, then exits to the right (like a well-drawn 'd').
  const WELL_EXPORTED_D =
    'M100 400 C150 250 250 200 350 250 C450 300 400 400 500 300 C600 200 700 250 750 400'

  it('has no gaps and checkpoint 1 sits at the lower-left, last checkpoint to the right', () => {
    const flat = flattenPathD(WELL_EXPORTED_D)
    const { points: ordered, hasGaps } = reorderForWriting(flat.points, flat.starts)
    expect(hasGaps).toBe(false)
    // First result point is the path's own start (already lower-left) — no rotation.
    expect(ordered[0]).toEqual(flat.points[0])

    const cfg = buildLetterConfig('d', WELL_EXPORTED_D)
    const cps = cfg.pathDefinition.checkpoints
    const first = cps[0]
    const last = cps[cps.length - 1]
    const minX = Math.min(...cps.map((c) => c.x))
    expect(first.x).toBeCloseTo(minX, 0) // leftmost (or near)
    expect(first.y).toBeGreaterThan(380) // below the middle line
    expect(last.x).toBeGreaterThan(first.x) // advances rightward
  })
})

describe('flattenPathD — implicit chained subcommands (SVG "letter not repeated")', () => {
  it('a single C with two chained cubic segments reaches the final endpoint (100,0) and starts at index 0', () => {
    // `C ... ...` with NO repeated command letter: the second group of 6 numbers
    // is an IMPLICIT continuation of the same cubic command. Before the fix this
    // was discarded after the first segment (49 points, last ≈ (40,60)).
    const flat = flattenPathD('M0 100 C0 100 20 80 40 60 60 40 80 20 100 0')
    expect(flat.starts).toEqual([0])
    expect(flat.points.length).toBeGreaterThan(90) // 1 start + 2×48 cubic steps
    const last = flat.points[flat.points.length - 1]
    expect(last.x).toBeCloseTo(100, 5)
    expect(last.y).toBeCloseTo(0, 5)
    // The final endpoint is the second segment's target, proving the implicit
    // cubic was actually evaluated (not thrown away).
    const prev = flat.points[flat.points.length - 2]
    expect(Math.hypot(prev.x - last.x, prev.y - last.y)).toBeLessThan(5)
  })

  it('implicit continuation honors relativity (lowercase c chained segments)', () => {
    // `m ... c ...` (relative) with chained implicit segments must chain from
    // the previous segment's endpoint, not from the origin.
    const flat = flattenPathD('m0 0 c0 10 10 10 10 0 0 -10 10 -10 10 0')
    expect(flat.starts).toEqual([0])
    // Two relative cubics, each 48 steps → ~97 points, ending back near start.
    expect(flat.points.length).toBeGreaterThan(90)
    const last = flat.points[flat.points.length - 1]
    expect(Math.hypot(last.x - 20, last.y - 0)).toBeLessThan(2)
  })
})

describe('buildLetterConfig — regression on the real Inkscape a.svg', () => {
  it('produces 6–12 checkpoints; checkpoint 1 sits low, the stroke is ONE continuous subpath, and the path does NOT loop back to the start', () => {
    const cfg = buildLetterConfig('a', realAD())
    const cps = cfg.pathDefinition.checkpoints
    expect(cps.length).toBeGreaterThanOrEqual(6)
    expect(cps.length).toBeLessThanOrEqual(12)
    const first = cps[0]
    const last = cps[cps.length - 1]
    // Checkpoint 1 is in the LOWER quadrant of the normalized ruled line: the
    // real a.svg begins at the lower-left (314,412), so without rotation it
    // still lands near the baseline.
    expect(first.y).toBeGreaterThan(380)
    // The real a.svg is a near-closed loop whose last node (~379,379) sits ~73px
    // from the start. After uniform normalization the first and last checkpoints
    // must stay clearly separated — this is exactly what broke before: the old
    // rotation cut the loop and the animation "returned" to the first node at
    // the end. The endpoints must NOT be glued together.
    const sep = Math.hypot(last.x - first.x, last.y - first.y)
    expect(sep).toBeGreaterThan(50)
    // The Inkscape a.svg is a SINGLE subpath: flatten→reorder must report no gaps
    // (a multi-subpath / stunted flatten would not). This is the real bug-catch
    // at the config level: the old flatten produced a chopped curve that still
    // normalized, so the gap/continuity invariant is what proves the full path.
    const flat = flattenPathD(realAD())
    const { hasGaps } = reorderForWriting(flat.points, flat.starts)
    expect(flat.starts.length).toBe(1)
    expect(hasGaps).toBe(false)
    // The checkpoints are in strict writing order.
    const orders = cps.map((c) => c.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})

describe('buildLetterConfig — user bug: writing-order checkpoints', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("stores a reordered M/L polyline (not the raw C/Q-composed path)", () => {
    const cfg = buildLetterConfig('a', realAD())
    expect(cfg.pathDefinition.d.startsWith('M')).toBe(true)
    expect(cfg.pathDefinition.d).toContain('L')
  })

  it('preserves file order (no inversion) and warns about the >15px gap of a 2-subpath fixture', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const FIGMA_TWO_SUBPATHS =
      'M10 10 L90 10 L90 90 L10 90 Z M300 10 L380 10 L380 90 L300 90 Z'
    const cfg = buildLetterConfig('a', FIGMA_TWO_SUBPATHS)
    expect(cfg.pathDefinition.checkpoints[0].order).toBe(1)
    // The disconnected subpaths (>15px jump) must trigger the gap warning.
    expect(warn).toHaveBeenCalled()
    const message = warn.mock.calls.map((c) => String(c[0])).join('\n')
    expect(message).toContain('tiene subpaths separados por más de 15px')
  })

  it('checkpoints advance in writing order (strictly increasing) for the real a.svg', () => {
    const cfg = buildLetterConfig('a', realAD())
    const cps = cfg.pathDefinition.checkpoints
    const orders = cps.map((c) => c.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(orders[0]).toBe(1)
    expect(orders[orders.length - 1]).toBe(orders.length)
    // NOTE: the real Inkscape 'a' is a near-closed single-stroke loop, so its
    // checkpoint order (no rotation — author order) ends back near the start
    // (last.x ≈ first.x). The "advances right" property is exercised instead by
    // the well-exported single-subpath fixture (see the 'ideal single-subpath
    // export' suite).
  })

  it('the reworder produces strictly increasing orders 1..N with >= 6 checkpoints', () => {
    const cfg = buildLetterConfig('a', realAD())
    const orders = cfg.pathDefinition.checkpoints.map((c) => c.order)
    expect(orders.length).toBeGreaterThanOrEqual(6)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(orders[0]).toBe(1)
    expect(orders[orders.length - 1]).toBe(orders.length)
  })
})

describe('loadSvgLetters', () => {
  it('loads hand-drawn SVGs present in the folder (a.svg) as normalized configs', () => {
    const letters = loadSvgLetters()
    expect(letters).toBeTypeOf('object')
    expect(Array.isArray(letters)).toBe(false)
    // a.svg ships in the folder, so its normalized config is present.
    expect(Object.keys(letters)).toContain('a')
    const cfg = letters.a
    expect(cfg.character).toBe('a')
    expect(cfg.family).toBe('ola')
    expect(cfg.baselineZone).toBe('media')
    // Normalized: bbox sits on the media zone inside the viewBox.
    const bb = bboxOf(cfg.pathDefinition.d)
    expect(bb.bottom).toBeCloseTo(BASELINE_Y, 0)
    expect(bb.top).toBeCloseTo(MIDDLE_LINE_Y, 0)
    expect(bb.centerX).toBeCloseTo(500, 0)
  })

  it('per-file pipeline (extractPathD + buildLetterConfig) yields a valid LetterConfig', () => {
    // Mirrors exactly what loadSvgLetters does per file, proven here without
    // touching disk (which would race with registry.test.ts's glob at load time).
    const fakeSvg =
      '<svg viewBox="0 0 1000 600"><path d="M100 400 Q200 200 300 400 Q400 200 500 400" fill="none"/></svg>'
    const d = extractPathD(fakeSvg)
    expect(d).not.toBeNull()
    const cfg = buildLetterConfig('z', d as string)
    expect(cfg.id).toBe('letra_z')
    expect(cfg.pathDefinition.guideD).toBeUndefined()
    expect(cfg.pathDefinition.checkpoints.length).toBeGreaterThanOrEqual(4)
    expect(cfg.pathDefinition.ideal.length).toBeGreaterThan(1500)
  })
})
