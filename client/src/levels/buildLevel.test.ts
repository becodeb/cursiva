// LevelConfig → LevelTarget derivation contract (docs/08 section 2).
import { describe, expect, it } from 'vitest'
import type { Point } from '../letters/types'
import { MAX_CORRIDOR, MIN_CORRIDOR, MIN_VIEWBOX_WIDTH, buildLevelTarget, levelStart } from './buildLevel'
import { LEGACY_PHASE_1, LEVELS, getLevel } from './catalog'
import { flattenPathD } from '../letters/svgLetter'
import { straight, wave, waveCrestRadius } from './paths'
import { DEMO_SPINES, spineDemoPaths, spineOrigin, type SpineConfig } from './spines'
import type { LevelConfig } from './types'
import { demoPlays, type GuideLevel } from '../screen/LevelPlay'

/**
 * Looks up an id in the active `LEVELS` catalog first, falling back to
 * `LEGACY_PHASE_1` (`detective-mode` Phase 11) — some of these fixtures
 * (`f1-travesia`, `f1-ondas`, `f1-espiral`) are retired, unwired configs, but
 * their geometry is preserved unchanged for exactly this kind of test.
 */
function anyLevel(id: string): LevelConfig {
  const level = LEVELS.find((l) => l.id === id) ?? LEGACY_PHASE_1.find((l) => l.id === id)
  if (!level) throw new Error(`Level not found (active or legacy): ${id}`)
  return level
}

function makeConfig(over: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 'test',
    phase: 1,
    title: 'Test',
    kind: 'path',
    surface: 'blank',
    maze: false,
    resetOnContact: false,
    carrier: false,
    feedback: { tone: true, haptics: true, metronomeBpm: 0, rail: false },
    hint: 'Seguí el camino.',
    paths: [straight()],
    corridorWidth: 100,
    rules: { mustBeContinuous: false, enforceOrder: true, minFluency: 0, minAccuracy: 55 },
    showGuide: true,
    letters: [],
    ...over,
  }
}

/** Distance from `p` to the segment ab — the honest distance to a polyline. */
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function distToPolyline(p: Point, polyline: Point[]): number {
  let best = Infinity
  for (let i = 1; i < polyline.length; i++) {
    const d = distToSegment(p, polyline[i - 1], polyline[i])
    if (d < best) best = d
  }
  return best
}

function maxBandOffset(
  ideal: ReadonlyArray<readonly [number, number]>,
  polyline: Point[],
): number {
  let max = 0
  for (const [x, y] of ideal) {
    const d = distToPolyline({ x, y }, polyline)
    if (d > max) max = d
  }
  return max
}

describe('buildLevelTarget — corridor width', () => {
  it('uses the nominal width when no factor is given', () => {
    expect(buildLevelTarget(makeConfig()).corridorWidth).toBe(100)
    expect(buildLevelTarget(makeConfig(), 1).corridorWidth).toBe(100)
  })

  it('applies the adaptive width factor', () => {
    expect(buildLevelTarget(makeConfig(), 1.25).corridorWidth).toBeCloseTo(125, 6)
    expect(buildLevelTarget(makeConfig(), 0.85).corridorWidth).toBeCloseTo(85, 6)
  })

  it('clamps to [30, 260] — neither three failures nor three passes leave the range', () => {
    expect(buildLevelTarget(makeConfig(), 10).corridorWidth).toBe(MAX_CORRIDOR)
    expect(buildLevelTarget(makeConfig(), 0.01).corridorWidth).toBe(MIN_CORRIDOR)
    expect(buildLevelTarget(makeConfig({ corridorWidth: 5 })).corridorWidth).toBe(MIN_CORRIDOR)
    expect(buildLevelTarget(makeConfig({ corridorWidth: 900 })).corridorWidth).toBe(MAX_CORRIDOR)
  })
})

describe('buildLevelTarget — polyline and length', () => {
  it('derives the polyline and arc length from the MAIN path only', () => {
    const target = buildLevelTarget(makeConfig({ paths: [straight(), straight({ y: 100 })] }))
    expect(target.polyline.length).toBeGreaterThan(2)
    expect(target.polyline[0]).toEqual({ x: 140, y: 360 })
    expect(target.length).toBeCloseTo(720, 6) // the second path adds nothing
  })

  it('keeps the config reachable on the target', () => {
    const config = makeConfig()
    expect(buildLevelTarget(config).config).toBe(config)
  })
})

describe('buildLevelTarget — routes (level-engine spec)', () => {
  it("routes[0] is the SAME polyline/length objects as the top-level fields, not copies", () => {
    const target = buildLevelTarget(makeConfig({ paths: [wave(), straight({ y: 120 })] }))
    expect(target.routes[0].polyline).toBe(target.polyline)
    expect(target.routes[0].length).toBe(target.length)
  })

  it('derives one route per path entry, in order', () => {
    const target = buildLevelTarget(
      makeConfig({ paths: [wave(), straight({ y: 120 }), straight({ y: 200 })] }),
    )
    expect(target.routes.length).toBe(3)
    for (const route of target.routes) {
      expect(route.polyline.length).toBeGreaterThan(1)
      expect(route.length).toBeGreaterThan(0)
    }
  })

  it('a free level has an empty routes array', () => {
    const target = buildLevelTarget(makeConfig({ kind: 'free', paths: [] }))
    expect(target.routes).toEqual([])
  })

  it('every shipped level keeps its routes[0] identical to polyline/length', () => {
    for (const config of LEVELS) {
      const target = buildLevelTarget(config)
      if (target.paths.length === 0) continue
      expect(target.routes[0].polyline).toBe(target.polyline)
      expect(target.routes[0].length).toBe(target.length)
    }
  })
})

describe('buildLevelTarget — checkpoints', () => {
  it('numbers a single-path level strictly 1..N', () => {
    const { checkpoints } = buildLevelTarget(makeConfig({ paths: [wave()] }))
    expect(checkpoints.length).toBeGreaterThanOrEqual(6)
    checkpoints.forEach((cp, i) => expect(cp.order).toBe(i + 1))
  })

  it('continues the numbering across pen-lift segments, never restarting', () => {
    const single = buildLevelTarget(makeConfig({ paths: [wave()] }))
    const multi = buildLevelTarget(
      makeConfig({ paths: [wave(), straight({ x0: 200, x1: 800, y: 120 })] }),
    )
    // Strictly 1..N over the WHOLE level, main checkpoints first.
    multi.checkpoints.forEach((cp, i) => expect(cp.order).toBe(i + 1))
    expect(multi.checkpoints.length).toBeGreaterThan(single.checkpoints.length)
    // The main path's checkpoints are unchanged by the appended segment.
    for (let i = 0; i < single.checkpoints.length; i++) {
      expect(multi.checkpoints[i].x).toBeCloseTo(single.checkpoints[i].x, 6)
      expect(multi.checkpoints[i].y).toBeCloseTo(single.checkpoints[i].y, 6)
    }
  })

  it('places every checkpoint on the path with a usable radius', () => {
    const target = buildLevelTarget(makeConfig({ paths: [wave()] }))
    for (const cp of target.checkpoints) {
      expect(distToPolyline({ x: cp.x, y: cp.y }, target.polyline)).toBeLessThan(1)
      expect(cp.radius).toBeGreaterThanOrEqual(35)
      expect(cp.radius).toBeLessThanOrEqual(60)
    }
  })
})

describe('buildLevelTarget — ideal cloud', () => {
  it('is a non-empty band hugging the path', () => {
    const target = buildLevelTarget(makeConfig({ paths: [wave()] }))
    expect(target.ideal.length).toBeGreaterThan(1000)
    expect(maxBandOffset(target.ideal, target.polyline)).toBeLessThanOrEqual(
      target.corridorWidth / 2,
    )
  })

  it('covers every path of a multi-path level', () => {
    const single = buildLevelTarget(makeConfig({ paths: [wave()] }))
    const multi = buildLevelTarget(
      makeConfig({ paths: [wave(), straight({ x0: 200, x1: 800, y: 120 })] }),
    )
    expect(multi.ideal.length).toBeGreaterThan(single.ideal.length)
    // A point on the pen-lift segment is inside the multi-path cloud only.
    const onSegment = { x: 500, y: 120 }
    expect(
      Math.min(...multi.ideal.map(([x, y]) => Math.hypot(x - onSegment.x, y - onSegment.y))),
    ).toBeLessThan(5)
  })

  it('widens with the width factor — a struggling child gets a wider corridor', () => {
    const narrow = buildLevelTarget(makeConfig({ paths: [wave()] }), 1)
    const wide = buildLevelTarget(makeConfig({ paths: [wave()] }), 1.5)
    expect(wide.corridorWidth).toBeGreaterThan(narrow.corridorWidth)
    expect(maxBandOffset(wide.ideal, wide.polyline)).toBeGreaterThan(
      maxBandOffset(narrow.ideal, narrow.polyline),
    )
  })

  it('never collapses the band below 4px, even at the minimum corridor', () => {
    const target = buildLevelTarget(makeConfig({ corridorWidth: 5 }))
    expect(maxBandOffset(target.ideal, target.polyline)).toBeGreaterThanOrEqual(4 - 1e-6)
  })
})

describe('buildLevelTarget — horizontal centring', () => {
  /** Bounding-box centre in X across every path of a level. */
  function centreX(paths: string[]): number {
    let minX = Infinity
    let maxX = -Infinity
    for (const d of paths) {
      for (const p of flattenPathD(d).points) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
      }
    }
    return (minX + maxX) / 2
  }

  it('centres every catalog level on its own sheet', () => {
    for (const level of LEVELS) {
      if (level.kind === 'free') continue // no bounding box to centre
      const target = buildLevelTarget(level)
      expect(centreX(target.paths)).toBeCloseTo(target.viewBoxWidth / 2, 0)
    }
  })

  it('centres a path authored far off to the right', () => {
    const target = buildLevelTarget(makeConfig({ paths: [straight({ x0: 700, x1: 980 })] }))
    expect(target.viewBoxWidth).toBe(MIN_VIEWBOX_WIDTH)
    expect(centreX(target.paths)).toBeCloseTo(500, 0)
    expect(target.polyline[0].x).toBeCloseTo(360, 0)
  })

  it('centres the COMBINED box of a multi-path level, not each path alone', () => {
    const target = buildLevelTarget(
      makeConfig({ paths: [straight({ x0: 600, x1: 800 }), straight({ x0: 800, x1: 900, y: 100 })] }),
    )
    expect(centreX(target.paths)).toBeCloseTo(500, 0)
    // Combined box was [600, 900] → centre 750 → shift −250.
    expect(centreX([target.paths[0]])).toBeCloseTo(450, 0)
  })

  it('translates on X ONLY — the ruled-line proportions are pedagogy', () => {
    const config = makeConfig({ paths: [straight({ x0: 700, x1: 980, y: 222 })] })
    const target = buildLevelTarget(config)
    const before = flattenPathD(config.paths[0]).points
    const after = flattenPathD(target.paths[0]).points
    expect(after).toHaveLength(before.length)
    for (let i = 0; i < after.length; i++) expect(after[i].y).toBeCloseTo(before[i].y, 6)
    // Same width: a translation never rescales.
    expect(after[after.length - 1].x - after[0].x).toBeCloseTo(
      before[before.length - 1].x - before[0].x,
      6,
    )
  })

  it('derives polyline, checkpoints and ideal from the CENTRED paths', () => {
    const target = buildLevelTarget(makeConfig({ paths: [straight({ x0: 700, x1: 980 })] }))
    const xs = target.polyline.map((p) => p.x)
    expect(Math.min(...xs)).toBeCloseTo(360, 0)
    expect(Math.max(...xs)).toBeCloseTo(640, 0)
    for (const cp of target.checkpoints) {
      expect(cp.x).toBeGreaterThanOrEqual(355)
      expect(cp.x).toBeLessThanOrEqual(645)
    }
    for (const [x] of target.ideal) {
      expect(x).toBeGreaterThanOrEqual(350)
      expect(x).toBeLessThanOrEqual(650)
    }
  })

  it('leaves a level with no flattenable geometry untouched', () => {
    const target = buildLevelTarget(makeConfig({ paths: [''] }))
    expect(target.paths).toEqual([''])
    expect(target.polyline).toEqual([])
  })
})

describe('buildLevelTarget — sheet width', () => {
  /** Left and right free margin of a level on its own sheet. */
  function margins(paths: string[], viewBoxWidth: number): { left: number; right: number } {
    let minX = Infinity
    let maxX = -Infinity
    for (const d of paths) {
      for (const p of flattenPathD(d).points) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
      }
    }
    return { left: minX, right: viewBoxWidth - maxX }
  }

  it('keeps a level that fits on the default 1000-wide sheet', () => {
    for (const id of ['f1-travesia', 'f1-ondas', 'f1-espiral', 'f3-a', 'f3-m', 'f4-la', 'f5-ala']) {
      expect(buildLevelTarget(anyLevel(id)).viewBoxWidth).toBe(MIN_VIEWBOX_WIDTH)
    }
  })

  it('widens the sheet for a word too long to fit — `mama`', () => {
    const target = buildLevelTarget(getLevel('f5-mama'))
    expect(target.viewBoxWidth).toBeGreaterThan(MIN_VIEWBOX_WIDTH)
    // 80 units of paper per side, so the r=22 start dot is never clipped.
    const { left, right } = margins(target.paths, target.viewBoxWidth)
    expect(left).toBeGreaterThanOrEqual(80)
    expect(right).toBeGreaterThanOrEqual(80)
    expect(target.polyline[0].x).toBeGreaterThan(22)
  })

  it('grows by exactly the overflow, keeping 80 units of margin per side', () => {
    // Span 1200 → sheet 1200 + 160 = 1360.
    const target = buildLevelTarget(makeConfig({ paths: [straight({ x0: 0, x1: 1200 })] }))
    expect(target.viewBoxWidth).toBe(1360)
    const { left, right } = margins(target.paths, target.viewBoxWidth)
    expect(left).toBeCloseTo(80, 0)
    expect(right).toBeCloseTo(80, 0)
  })

  it('never rescales — a wider sheet keeps every span and every Y', () => {
    const config = makeConfig({ paths: [straight({ x0: 0, x1: 1200, y: 333 })] })
    const before = flattenPathD(config.paths[0]).points
    const after = flattenPathD(buildLevelTarget(config).paths[0]).points
    expect(after).toHaveLength(before.length)
    for (let i = 0; i < after.length; i++) expect(after[i].y).toBeCloseTo(before[i].y, 6)
    expect(after[after.length - 1].x - after[0].x).toBeCloseTo(1200, 6)
  })

  it('falls back to the default sheet with no flattenable geometry', () => {
    expect(buildLevelTarget(makeConfig({ paths: [''] })).viewBoxWidth).toBe(MIN_VIEWBOX_WIDTH)
  })
})

describe('buildLevelTarget — viewWidth (scrolling-camera spec, "Sheet Width and View Width Are Distinct Quantities")', () => {
  it('every shipped level with no camera field reports viewWidth === viewBoxWidth', () => {
    // `dolphin3`/`dolphin4` are the only two shipped levels that opt into a
    // camera (`level-engine` spec, "Optional Camera Field..."); every other
    // shipped level, including every level that predates this capability,
    // MUST keep the parity — asserted separately below for the two that do
    // opt in.
    for (const level of [...LEVELS, ...LEGACY_PHASE_1]) {
      if (level.camera) continue
      const target = buildLevelTarget(level)
      expect(target.viewWidth, level.id).toBe(target.viewBoxWidth)
    }
  })

  it('dolphin3/dolphin4 are the two shipped levels whose sheet is wider than their view', () => {
    for (const id of ['dolphin3', 'dolphin4']) {
      const target = buildLevelTarget(getLevel(id))
      expect(target.viewBoxWidth, id).toBeGreaterThan(target.viewWidth)
      expect(target.viewWidth, id).toBe(MIN_VIEWBOX_WIDTH)
    }
  })

  it('a level authoring a narrower camera window reports viewWidth < viewBoxWidth, while viewBoxWidth stays the full world', () => {
    // A wide synthetic path (span 1400 → world 1560) with a camera window of
    // 200 — independent of any catalog level, per design.md §1.2's `Math.min`
    // clamp: `viewWidth = Math.min(config.camera?.viewWidth ?? MIN_VIEWBOX_WIDTH, viewBoxWidth)`.
    const config = makeConfig({
      paths: [straight({ x0: 0, x1: 1400 })],
      camera: { viewWidth: 200, lead: 0.5 },
    })
    const target = buildLevelTarget(config)
    expect(target.viewBoxWidth).toBeGreaterThan(1400)
    expect(target.viewWidth).toBe(200)
  })
})

describe('buildLevelTarget — purity', () => {
  it('is deterministic for the same input', () => {
    const config = makeConfig({ paths: [wave()] })
    expect(buildLevelTarget(config, 1.2)).toEqual(buildLevelTarget(config, 1.2))
  })
})

describe('buildLevelTarget — a free level has no target', () => {
  const free = makeConfig({ kind: 'free', paths: [], corridorWidth: 0 })

  it('derives an empty target instead of crashing on the missing path', () => {
    const target = buildLevelTarget(free)
    expect(target.paths).toEqual([])
    expect(target.ideal).toEqual([])
    expect(target.checkpoints).toEqual([])
    expect(target.polyline).toEqual([])
    expect(target.length).toBe(0)
  })

  it('still lays it out on the default sheet — the child needs paper', () => {
    expect(buildLevelTarget(free).viewBoxWidth).toBe(MIN_VIEWBOX_WIDTH)
  })

  it('carries its config through, so the scorer can tell it is free', () => {
    expect(buildLevelTarget(free).config.kind).toBe('free')
  })

  it('treats a `path` level authored with no paths the same way', () => {
    // Defensive: a level cannot be allowed to blank the app (catalog.ts).
    expect(() => buildLevelTarget(makeConfig({ paths: [] }))).not.toThrow()
    expect(buildLevelTarget(makeConfig({ paths: [] })).ideal).toEqual([])
  })

  it('builds the shipped f1-libre without a path', () => {
    const target = buildLevelTarget(getLevel('f1-libre'))
    expect(target.checkpoints).toEqual([])
    expect(target.viewBoxWidth).toBe(MIN_VIEWBOX_WIDTH)
  })
})

// [the carrier repair, general] `levelStart`: the one place a routeless
// mechanic plugs its own start in (design.md §2.2). Every shipped level's
// target stays byte-identical — `target.start` is `undefined` exactly where
// `target.polyline[0]` was `undefined` before this field existed.
describe('levelStart — the routeless carrier-visibility repair', () => {
  it('returns polyline[0] whenever a polyline exists, whatever config.waypoints says', () => {
    const polyline: Point[] = [{ x: 12, y: 34 }, { x: 56, y: 78 }]
    expect(levelStart(makeConfig(), polyline)).toEqual({ x: 12, y: 34 })
    expect(
      levelStart(
        makeConfig({ waypoints: { start: { x: 999, y: 999 } } as unknown as LevelConfig['waypoints'] }),
        polyline,
      ),
    ).toEqual({ x: 12, y: 34 })
  })

  it('falls back to config.waypoints.start when the polyline is empty', () => {
    const start = { x: 250, y: 400 }
    expect(
      levelStart(makeConfig({ waypoints: { start } as unknown as LevelConfig['waypoints'] }), []),
    ).toEqual(start)
  })

  it('returns undefined for an empty polyline and no authored waypoints — every shipped free level', () => {
    expect(levelStart(makeConfig({ kind: 'free', paths: [] }), [])).toBeUndefined()
  })

  it("every shipped level's target.start is byte-identical to its old target.polyline[0] (undefined stays undefined) — except the bee family, which now authors its own", () => {
    // The four bee levels are the ONLY shipped levels with a `waypoints`
    // field (`free-trail-waypoints`), and `target.start` falling back to
    // their authored `waypoints.start` instead of staying `undefined` is
    // the whole repair this describe block is named for — not a regression
    // of this claim, its first real exercise.
    for (const level of [...LEVELS, ...LEGACY_PHASE_1]) {
      const target = buildLevelTarget(level)
      if (level.waypoints) {
        expect(target.start, level.id).toEqual(level.waypoints.start)
        expect(target.polyline[0], level.id).toBeUndefined()
      } else if (level.spines) {
        expect(target.start, level.id).toEqual(spineOrigin(level.spines))
        expect(target.polyline[0], level.id).toBeUndefined()
      } else {
        expect(target.start, level.id).toEqual(target.polyline[0])
      }
    }
  })
})

// [radial-spines, Phase 5] `levelStart`'s THIRD source (design.md §4): a
// routeless spine level begins at its first anchor, derived from the same
// generator the scorer and the layer read.
describe("levelStart — the spines source (radial-spines capability)", () => {
  const spines: SpineConfig = {
    pose: 'profile',
    body: { centre: { x: 440, y: 440 }, height: 260 },
    arc: { from: 200, to: 380 },
    count: 5,
    rules: { baseRadius: 38, tolDeg: 40, straightness: 0.8, lenMin: 220, lenMax: 290 },
  }

  it('resolves a spines level start to spineOrigin(cfg) when the polyline is empty', () => {
    expect(levelStart(makeConfig({ kind: 'free', paths: [], spines }), [])).toEqual(
      spineOrigin(spines),
    )
  })

  it('a routed level still wins on polyline[0], regardless of spines', () => {
    const polyline: Point[] = [{ x: 12, y: 34 }, { x: 56, y: 78 }]
    expect(levelStart(makeConfig({ spines }), polyline)).toEqual({ x: 12, y: 34 })
  })

  it('levels using the other two sources are unaffected by the third existing', () => {
    const start = { x: 250, y: 400 }
    expect(
      levelStart(makeConfig({ waypoints: { start } as unknown as LevelConfig['waypoints'] }), []),
    ).toEqual(start)
    expect(levelStart(makeConfig({ kind: 'free', paths: [] }), [])).toBeUndefined()
  })
})

// [radial-spines, Phase 5] The demo repair (design.md §2 D3) — TWO
// independent blockers, both confirmed red against `main` before their own
// repair landed (§11.1 item 5).
describe('buildLevelTarget — demoPaths (the demo repair, half 1: target.paths → demoPaths)', () => {
  const spines: SpineConfig = {
    pose: 'profile',
    body: { centre: { x: 440, y: 440 }, height: 260 },
    arc: { from: 200, to: 380 },
    count: 5,
    rules: { baseRadius: 38, tolDeg: 40, straightness: 0.8, lenMin: 220, lenMax: 290 },
  }

  it('a routeless spines level with demo:true emits at least one demo segment — the repair this test guards', () => {
    const target = buildLevelTarget(makeConfig({ kind: 'free', paths: [], demo: true, spines }))
    expect(target.demoPaths.length).toBeGreaterThanOrEqual(1)
    expect(target.demoPaths).toEqual(spineDemoPaths(spines, DEMO_SPINES))
  })

  it('a routeless level with demo:true and NO spines still emits zero segments — byte-identical to before this change', () => {
    const target = buildLevelTarget(makeConfig({ kind: 'free', paths: [], demo: true }))
    expect(target.demoPaths).toEqual([])
  })

  it('demoPaths === paths BY REFERENCE for every shipped level without spines (routed or empty free alike)', () => {
    for (const level of [...LEVELS, ...LEGACY_PHASE_1]) {
      if (level.spines) continue
      const target = buildLevelTarget(level)
      expect(target.demoPaths, level.id).toBe(target.paths)
    }
  })

  it("a routed level's demoPaths is the SAME array reference as paths, not a copy", () => {
    const target = buildLevelTarget(makeConfig({ paths: [wave()] }))
    expect(target.demoPaths).toBe(target.paths)
  })
})

// [radial-spines, Phase 5] `demoPlays` — the second, unnamed demo blocker.
//
// **A found defect in design.md §2 D3, resolved rather than followed
// blindly**: the design states `demoPlays`'s formula as UNCHANGED from the
// old `playDemo` (`!!level.demo && guide === 'full'`) and separately
// requires (§11.1 item 5) `demoPlays(level, 'none') === true` for a
// routeless `spines` level with `demo: true`. Those two cannot both hold —
// every hedgehog config carries `showGuide: false` (design.md §8), so
// `guideLevelFor` can only ever return `'none'` for it, and the unchanged
// formula would leave the demo permanently unreachable despite the rename.
// The resolution implemented in `LevelPlay.tsx` (see `demoPlays`'s own doc
// comment there for the full reasoning): a `spines` level bypasses the
// guide-band gate entirely (`!!level.demo`, unconditional on `guide`),
// because such a level authors no guide ladder to withdraw from in the
// first place; every other level keeps the exact old formula.
describe('buildLevelTarget — demoPaths (the demo repair, half 2: the demoPlays gate)', () => {
  it("demoPlays(level,'none') === true for a demo:true, spines-bearing free level — the second, unnamed blocker", () => {
    // Confirmed red against `main` before the rename landed: `main`'s
    // inline `playDemo = !!level.demo && guideLevel === 'full'` requires
    // `guideLevel === 'full'`, which a `showGuide: false` spines level can
    // never reach — this assertion is the repair.
    expect(demoPlays({ demo: true, spines: {} as unknown as SpineConfig }, 'none')).toBe(true)
  })

  it('a demo:true, spines-bearing level plays regardless of the guide band', () => {
    const guideLevels: readonly GuideLevel[] = ['full', 'dotted', 'minimal', 'none']
    for (const g of guideLevels) {
      expect(demoPlays({ demo: true, spines: {} as unknown as SpineConfig }, g)).toBe(true)
    }
  })

  it('a spines-bearing level with demo:false never plays, for any guide band', () => {
    const guideLevels: readonly GuideLevel[] = ['full', 'dotted', 'minimal', 'none']
    for (const g of guideLevels) {
      expect(demoPlays({ demo: false, spines: {} as unknown as SpineConfig }, g)).toBe(false)
    }
  })

  it('demoPlays(l, g) === (!!l.demo && g === \'full\') for every shipped level (none of which carries spines) and every GuideLevel', () => {
    const guideLevels: readonly GuideLevel[] = ['full', 'dotted', 'minimal', 'none']
    for (const level of [...LEVELS, ...LEGACY_PHASE_1]) {
      expect(level.spines, level.id).toBeUndefined()
      for (const g of guideLevels) {
        expect(demoPlays(level, g), `${level.id}/${g}`).toBe(!!level.demo && g === 'full')
      }
    }
  })

  it('no shipped kind:\'free\' level declares demo — the new branch is unreachable without spines', () => {
    for (const level of [...LEVELS, ...LEGACY_PHASE_1]) {
      if (level.kind === 'free' && !level.spines) expect(level.demo).toBeFalsy()
    }
  })
})

describe('buildLevelTarget — el sendero se estrecha', () => {
  /** Widest band offset over the first / last fifth of the route, by arc length. */
  function bandAtEnds(config: LevelConfig): { start: number; end: number } {
    const target = buildLevelTarget(config)
    const polyline = target.polyline
    // The ideal cloud is emitted in centreline order, three points per sample.
    const samples = target.ideal.length / 3
    const slice = (from: number, to: number): number =>
      maxBandOffset(target.ideal.slice(Math.round(from * samples) * 3, Math.round(to * samples) * 3), polyline)
    return { start: slice(0, 0.2), end: slice(0.8, 1) }
  }

  it('keeps a constant band when no taper is declared', () => {
    const { start, end } = bandAtEnds(makeConfig({ corridorWidth: 100 }))
    expect(start).toBeCloseTo(end, 0)
  })

  it('starts forgiving and narrows along the ARC of the route', () => {
    const { start, end } = bandAtEnds(
      makeConfig({ corridorWidth: 100, taper: { from: 1.3, to: 0.7 } }),
    )
    // Nominal half-band is 100/2 − 6 = 44, so the factor runs 1.3 → 0.7 and
    // the band runs ~57 → ~31 across the route.
    expect(start).toBeGreaterThan(50)
    expect(end).toBeLessThan(38)
    expect(start).toBeGreaterThan(end * 1.4)
  })

  it('never lets the taper close the corridor below the floor', () => {
    const { end } = bandAtEnds(makeConfig({ corridorWidth: 40, taper: { from: 1, to: 0.001 } }))
    expect(end).toBeGreaterThanOrEqual(4)
  })

  it('widens with the adaptive factor exactly as an untapered level does', () => {
    // The taper is a SHAPE, not a difficulty: three failures must still widen.
    const config = makeConfig({ corridorWidth: 100, taper: { from: 1.3, to: 0.7 } })
    expect(buildLevelTarget(config, 1.5).corridorWidth).toBeCloseTo(150, 6)
  })

  it('tapers the retired f1-travesia (LEGACY_PHASE_1, detective-mode Phase 11)', () => {
    const { start, end } = bandAtEnds(anyLevel('f1-travesia'))
    expect(start).toBeGreaterThan(end)
  })

  it('leaves a pen-lift secondary at the nominal width', () => {
    // A letter's dot is not a stretch of the route, so it does not narrow.
    const target = buildLevelTarget(
      makeConfig({
        paths: [straight(), straight({ x0: 300, x1: 500, y: 120 })],
        corridorWidth: 100,
        taper: { from: 1.3, to: 0.7 },
      }),
    )
    const secondary = target.ideal.slice(600 * 3)
    const centre = flattenPathD(target.paths[1]).points
    expect(maxBandOffset(secondary, centre)).toBeCloseTo(44, 0)
  })
})

describe('buildLevelTarget — pushBand containment on wave crests (design.md §2)', () => {
  // `band = max(MIN_BAND, corridorWidth/2 − BAND_INSET)` is `pushBand`'s own
  // containment bound (buildLevel.ts:160): every point it pushes sits at
  // distance exactly `half ≤ band` from a point ON the centreline, so the
  // ideal cloud can never leave the drawn channel, folded or not, at any
  // curvature, on any generator (design.md §2's proof, not measured per-case).
  function nominalBand(level: LevelConfig): number {
    // Against the EFFECTIVE, engine-clamped width (`snake4`'s own 28 is
    // authored below `MIN_CORRIDOR` on purpose — R1's ordering needs it
    // strictly under `snake3`'s own floor-pinned 30 — so `buildLevelTarget`
    // actually bands the ideal cloud at 30, not 28).
    const band = Math.max(4, Math.max(MIN_CORRIDOR, level.corridorWidth) / 2 - 6)
    // `pushBand` scales `band` by `taper.from ↔ taper.to` along the route
    // (buildLevel.ts:74-76), so the widest point the ideal cloud ever reaches
    // is `band × max(from, to)`, not the untapered nominal value.
    const factor = level.taper ? Math.max(level.taper.from, level.taper.to) : 1
    return band * factor
  }

  it('keeps every catalog level with a corridor inside its own band, folded or not', () => {
    for (const level of LEVELS) {
      if (level.kind !== 'path' || level.paths.length === 0) continue
      const target = buildLevelTarget(level)
      if (target.ideal.length === 0) continue
      const band = nominalBand(level)
      // `target.ideal` is pushed off a RESAMPLED centreline while
      // `target.polyline` is the raw flattened one, so a hair of
      // discretization error (< 0.1 unit, measured) separates the two
      // representations of the same curve — the mathematical bound itself is
      // exact against the continuous centreline (design.md §2).
      //
      // A level with MORE THAN ONE route (the snake family) pushes a band
      // per path onto the SAME `target.ideal` array, so a point belonging to
      // one route is never near `target.polyline` alone (`paths[0]`) — it is
      // near its OWN route. Measured against the NEAREST of the level's own
      // `routes` (never a phantom segment bridging two disjoint routes,
      // since each route's own polyline is tested separately and only the
      // minimum kept), which degrades to the single-polyline check exactly
      // for every level with one route.
      const polylines = target.routes.length > 0 ? target.routes.map((r) => r.polyline as Point[]) : [target.polyline]
      let worst = 0
      for (const [x, y] of target.ideal) {
        const nearest = Math.min(...polylines.map((poly) => distToPolyline({ x, y }, poly)))
        if (nearest > worst) worst = nearest
      }
      expect(worst, level.id).toBeLessThanOrEqual(band + 0.1)
    }
  })

  it('is TIGHT, not vacuous: the same predicate at band − 1 fails for duck-trail2', () => {
    const level = getLevel('duck-trail2')
    const target = buildLevelTarget(level)
    const band = nominalBand(level)
    expect(maxBandOffset(target.ideal, target.polyline)).toBeGreaterThan(band - 1)
  })

  it('records which duck crests fold and which do not (design.md §2 table)', () => {
    // A crest folds when its radius of curvature R = w²/(8A) is UNDER the
    // band — `pushBand`'s fixed ±half offset then folds through itself on
    // the crest's concave side.
    const cases: ReadonlyArray<{ label: string; R: number; band: number; folds: boolean }> = [
      { label: 'step 1 (duck-trail1)', R: waveCrestRadius(410, 170), band: 100 / 2 - 6, folds: false },
      { label: 'step 2 (duck-trail2)', R: waveCrestRadius(205, 170), band: 90 / 2 - 6, folds: true },
      { label: 'step 3 cycle 1', R: waveCrestRadius(235, 155), band: 80 / 2 - 6, folds: false },
      { label: 'step 3 cycle 2', R: waveCrestRadius(175, 205), band: 80 / 2 - 6, folds: true },
      { label: 'step 4 (duck-trail4)', R: waveCrestRadius(410 / 3, 170), band: 70 / 2 - 6, folds: true },
    ]
    for (const c of cases) {
      expect(c.R < c.band, c.label).toBe(c.folds)
    }
  })
})
