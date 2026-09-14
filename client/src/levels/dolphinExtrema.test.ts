// `routeExtrema`/`vertexArtPoints` (`scrolling-camera`/`level-engine` specs;
// design.md §5.1, A2). Pure, DOM-free — a SIBLING of `levels/vertexArt.ts`'s
// `routeApexes`, never a mode on it: `routeApexes` has two shipped consumers
// (eight sheep and llama levels) whose behaviour must not change.
import { describe, expect, it } from 'vitest'
import { routeApexes } from './vertexArt'
import { getLevel } from './catalog'
import { buildLevelTarget } from './buildLevel'
import { wave } from './paths'
import { routeExtrema, vertexArtPoints } from './dolphinExtrema'
import { MAX_WIDTH_FACTOR } from '../game/adaptiveTolerance'

const RIDGE_IDS = [
  'sheep-hill1',
  'sheep-hill2',
  'sheep-hill3',
  'sheep-hill4',
  'llama-peak1',
  'llama-peak2',
  'llama-peak3',
  'llama-peak4',
]

describe('routeExtrema — the superset proof (design.md §5.1, A2)', () => {
  it('its crests reproduce routeApexes exactly on all eight shipped ridge levels', () => {
    for (const id of RIDGE_IDS) {
      const { polyline } = buildLevelTarget(getLevel(id))
      const crests = routeExtrema(polyline)
        .filter((e) => e.side === 'crest')
        .map(({ x, y }) => ({ x, y }))
      expect(crests, id).toEqual(routeApexes(polyline))
    }
  })

  it('A2: routeApexes finds NOTHING on a smooth wave — the row that names the amendment', () => {
    // A synthetic dolphin-shaped route, built from the shipped `wave`
    // generator — no real dolphin level exists yet (Phase 5).
    const { polyline } = buildLevelTarget(
      makeWaveConfig({ x0: 80, x1: 1480, y: 300, amplitude: 160, cycles: 5 }),
    )
    expect(routeApexes(polyline)).toEqual([])
  })
})

// A minimal path-kind config wrapping a `wave()` route — mirrors
// `buildLevel.test.ts`'s own `makeConfig` helper, restated here so this file
// stays self-contained and importable before `catalog.ts` authors any real
// dolphin level.
function makeWaveConfig(o: {
  x0: number
  x1: number
  y: number
  amplitude: number
  cycles: number
}) {
  return {
    id: 'test-wave',
    phase: 1 as const,
    title: 'Test',
    kind: 'path' as const,
    surface: 'blank' as const,
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: true, haptics: true, metronomeBpm: 0, rail: false },
    hint: 'Test',
    paths: [wave(o)],
    corridorWidth: 100,
    rules: { mustBeContinuous: false, enforceOrder: true, minFluency: 0, minAccuracy: 55 },
    showGuide: true,
    letters: [],
  }
}

describe('routeExtrema — a synthetic wave route finds troughs as well as crests', () => {
  const { polyline } = buildLevelTarget(
    makeWaveConfig({ x0: 80, x1: 1480, y: 300, amplitude: 160, cycles: 5 }),
  )
  const extrema = routeExtrema(polyline)

  it('returns points tagged trough as well as points tagged crest', () => {
    expect(extrema.some((e) => e.side === 'crest')).toBe(true)
    expect(extrema.some((e) => e.side === 'trough')).toBe(true)
  })

  it('alternates crest, trough, … from the first, at x within 0.5 of x0 + (i+0.5)*w and y within 0.5 of 300 ∓ 160', () => {
    const x0 = 80
    const w = (1480 - 80) / (2 * 5) // half-period
    expect(extrema.length).toBe(10) // 5 cycles → 10 half-periods → 10 extrema
    extrema.forEach((e, i) => {
      expect(e.side, `extrema[${i}].side`).toBe(i % 2 === 0 ? 'crest' : 'trough')
      expect(e.x, `extrema[${i}].x`).toBeCloseTo(x0 + (i + 0.5) * w, 0)
      expect(e.y, `extrema[${i}].y`).toBeCloseTo(i % 2 === 0 ? 300 - 160 : 300 + 160, 0)
    })
  })
})

describe('vertexArtPoints', () => {
  const extrema = routeExtrema(
    buildLevelTarget(makeWaveConfig({ x0: 80, x1: 910, y: 300, amplitude: 160, cycles: 2 })).polyline,
  )

  it('crest points are e.y - cw/2 - clear', () => {
    const points = vertexArtPoints(extrema, { corridorWidth: 110, size: 64, clear: 8 })
    const crestExtrema = extrema.filter((e) => e.side === 'crest')
    const crestPoints = points.filter((_, i) => extrema[i].side === 'crest')
    crestExtrema.forEach((e, i) => {
      expect(crestPoints[i].y).toBeCloseTo(e.y - 110 / 2 - 8, 6)
      expect(crestPoints[i].x).toBeCloseTo(e.x, 6)
    })
  })

  it('trough points are e.y + cw/2 + clear + size', () => {
    const points = vertexArtPoints(extrema, { corridorWidth: 110, size: 64, clear: 8 })
    const troughExtrema = extrema.filter((e) => e.side === 'trough')
    const troughPoints = points.filter((_, i) => extrema[i].side === 'trough')
    troughExtrema.forEach((e, i) => {
      expect(troughPoints[i].y).toBeCloseTo(e.y + 110 / 2 + 8 + 64, 6)
      expect(troughPoints[i].x).toBeCloseTo(e.x, 6)
    })
  })

  it("dolphin1's own literals (design.md §5.2/§5.3): the AUTHORED-width placement overlaps a WIDENED channel by exactly 47 of the picture's 64 units — a bounded, disclosed consequence, not a defect", () => {
    // A=160, cw=110 (dolphin1's authored corridor), clear=8, size=64 — the
    // family's own literals, used here as a fixture ahead of Phase 5's
    // catalog entry. Crest y = 300 - 160 = 140.
    const crest = extrema.find((e) => e.side === 'crest')!
    const AUTHORED_CW = 110
    const [point] = vertexArtPoints([crest], { corridorWidth: AUTHORED_CW, size: 64, clear: 8 })
    const box = { top: point.y - 64, bottom: point.y }
    // The channel the child actually sees once three misses widen it —
    // `game/adaptiveTolerance.ts`'s own MAX_WIDTH_FACTOR, never re-derived.
    const widenedCw = AUTHORED_CW * MAX_WIDTH_FACTOR
    const channel = { top: crest.y - widenedCw / 2, bottom: crest.y + widenedCw / 2 }
    // `crest.y` comes from a densely-sampled cubic, not an exact analytic
    // extremum — within 0.5 units of the ideal 140, the same tolerance
    // design.md §6.3 states for extrema x/y in general.
    expect(channel.top).toBeCloseTo(30, 0) // design.md §5.3's own worked number
    const overlap = Math.min(box.bottom, channel.bottom) - Math.max(box.top, channel.top)
    expect(overlap).toBeCloseTo(47, 0)
  })

  it('falsifiability: feeding the WIDENED width into vertexArtPoints itself (instead of the authored one) moves the picture, which §5.1 forbids — the correct call site is not a matter of taste (clues.test.ts:306 discipline)', () => {
    const crest = extrema.find((e) => e.side === 'crest')!
    const authored = vertexArtPoints([crest], { corridorWidth: 110, size: 64, clear: 8 })[0]
    const wrongCallSite = vertexArtPoints([crest], {
      corridorWidth: 110 * MAX_WIDTH_FACTOR,
      size: 64,
      clear: 8,
    })[0]
    expect(wrongCallSite.y).not.toBeCloseTo(authored.y, 6)
  })
})
