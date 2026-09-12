// Catalog contract (docs/08 section 5). The catalog is data, so these tests
// guard the DATA: ids, phases, rules and the promise that every authored path
// is something the engine can actually build a target from.
//
// `detective-mode` retheme (design units 9-10, level-engine spec "Phase-1
// Trail Set and Arc-Length Floor" / "Square-Wave Corner Constraint" /
// "f1-libre Retheme Carries No Clue"): phase 1 now ships four themed trails
// plus the rethemed, clue-free `f1-libre`, and the six unthemed corridor
// configs live on as the unwired, exported `LEGACY_PHASE_1`.
import { describe, expect, it } from 'vitest'
import { flattenPathD } from '../letters/svgLetter'
import { LevelProgressStore } from '../game/LevelProgressStore'
import type { StorageLike } from '../game/LevelProgressStore'
import { migratePhase1 } from '../game/migratePhase1'
import { DETECTIVE_TRAIL_IDS, DUCK_TRAIL_IDS, EMPTY_RECORD } from '../game/types'
import type { LevelRecord } from '../game/types'
import { migrateDuckCase } from '../game/migrateDuckCase'
import { BAND_INSET, buildLevelTarget } from './buildLevel'
import { clueCountFor } from '../detective/clues'
import {
  DEGRADED_LEVEL_IDS,
  LEGACY_PHASE_1,
  LEVELS,
  PHASE_TITLES,
  getLevel,
  levelsByPhase,
  nextLevelId,
} from './catalog'
import { hazardGapFraction } from './obstacles'
import { armClearance, cornerClearance, spiral, uTurnRadius } from './paths'
import type { Phase } from './types'

// docs/08 section 5 tables, after the detective-mode retheme: 1 libre + 4
// rastros del pato + 4 detective trails + 4 patrones + 3 desafíos del agua +
// 4 grafemas + 2 enlaces + 2 palabras.
const EXPECTED_IDS = [
  'f1-libre',
  'duck-trail1',
  'duck-trail2',
  'duck-trail3',
  'duck-trail4',
  'trail1',
  'trail2',
  'trail3',
  'trail4',
  'f2-guirnalda',
  'f2-agua2',
  'f2-agua3',
  'f2-agua4',
  'f2-colinas',
  'f2-bucles',
  'f2-crestas',
  'f3-l',
  'f3-a',
  'f3-m',
  'f3-o',
  'f4-la',
  'f4-ma',
  'f5-ala',
  'f5-mama',
]

const REMOVED_IDS = ['f1-travesia', 'f1-pelotas', 'f1-paseo', 'f1-pasillo', 'f1-ondas', 'f1-espiral']

describe('LEVELS — catalog shape', () => {
  it('holds exactly the levels of the docs/08 section 5 tables, in play order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(EXPECTED_IDS)
    expect(LEVELS).toHaveLength(EXPECTED_IDS.length)
  })

  it('has unique ids', () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length)
  })

  it('covers all five phases, in ascending order', () => {
    const phases = LEVELS.map((l) => l.phase)
    expect(new Set(phases)).toEqual(new Set<Phase>([1, 2, 3, 4, 5]))
    for (let i = 1; i < phases.length; i++) {
      expect(phases[i]).toBeGreaterThanOrEqual(phases[i - 1])
    }
  })

  it('names every phase', () => {
    for (const phase of [1, 2, 3, 4, 5] as Phase[]) {
      expect(PHASE_TITLES[phase].length).toBeGreaterThan(0)
    }
  })

  it('gives every level a title and a short Spanish hint', () => {
    for (const level of LEVELS) {
      expect(level.title.length).toBeGreaterThan(0)
      expect(level.hint.length).toBeGreaterThan(0)
      expect(level.hint.length).toBeLessThanOrEqual(80)
      // Never name the failure (docs/03 section 7).
      expect(level.hint.toLowerCase()).not.toMatch(/\bmal\b|error|incorrect/)
    }
  })
})

describe('LEVELS — authored values match the doc tables', () => {
  const CORRIDORS: Record<string, number> = {
    'f1-libre': 0,
    'duck-trail1': 100,
    'duck-trail2': 90,
    'duck-trail3': 80,
    'duck-trail4': 70,
    trail1: 90,
    trail2: 70,
    trail3: 90,
    trail4: 70,
    'f2-guirnalda': 100,
    'f2-agua2': 80,
    'f2-agua3': 68,
    'f2-agua4': 90,
    'f2-colinas': 85,
    'f2-bucles': 80,
    'f2-crestas': 80,
    'f3-l': 42,
    'f3-a': 42,
    'f3-m': 42,
    'f3-o': 42,
    'f4-la': 40,
    'f4-ma': 40,
    'f5-ala': 40,
    'f5-mama': 40,
  }
  const FLUENCY: Record<string, number> = {
    'f1-libre': 0,
    'duck-trail1': 0,
    'duck-trail2': 0,
    'duck-trail3': 0,
    'duck-trail4': 0,
    trail1: 0,
    trail2: 0,
    trail3: 0,
    trail4: 0,
    'f2-guirnalda': 35,
    'f2-agua2': 38,
    'f2-agua3': 40,
    'f2-agua4': 0,
    'f2-colinas': 40,
    'f2-bucles': 45,
    'f2-crestas': 45,
    'f3-l': 40,
    'f3-a': 40,
    'f3-m': 45,
    'f3-o': 45,
    'f4-la': 50,
    'f4-ma': 50,
    'f5-ala': 55,
    'f5-mama': 55,
  }

  it('matches the corridor widths', () => {
    for (const level of LEVELS) expect(level.corridorWidth).toBe(CORRIDORS[level.id])
  })

  it('matches the minimum fluency thresholds', () => {
    for (const level of LEVELS) expect(level.rules.minFluency).toBe(FLUENCY[level.id])
  })

  it('scales minAccuracy by phase: 55 / 60 / 65', () => {
    for (const level of LEVELS) {
      const expected = level.phase === 1 ? 55 : level.phase === 2 ? 60 : 65
      expect(level.rules.minAccuracy).toBe(expected)
    }
  })

  it('makes phase 2 onward continuous, and phase 1 free except the coil trail', () => {
    for (const level of LEVELS) {
      if (level.phase >= 2) expect(level.rules.mustBeContinuous).toBe(true)
    }
    expect(getLevel('f1-libre').rules.mustBeContinuous).toBe(false)
    expect(getLevel('trail1').rules.mustBeContinuous).toBe(false)
    // The coil trail REQUIRES one continuous stroke, exactly like the spiral
    // it reuses — the same turn the `a`/`c`/`o` family needs later.
    expect(getLevel('trail2').rules.mustBeContinuous).toBe(true)
    expect(getLevel('trail3').rules.mustBeContinuous).toBe(false)
    expect(getLevel('trail4').rules.mustBeContinuous).toBe(false)
  })

  it('makes the link and word levels continuous — the stroke cut is the error to detect', () => {
    for (const id of ['f4-la', 'f4-ma', 'f5-ala', 'f5-mama']) {
      expect(getLevel(id).rules.mustBeContinuous).toBe(true)
    }
  })

  it('validates stroke direction on every level with a route to follow', () => {
    for (const level of LEVELS) {
      // `f1-libre` has no path, so it has no checkpoints and no right way
      // round: enforcing order there would invent an error the level lacks.
      expect(level.rules.enforceOrder).toBe(level.kind === 'path')
    }
  })

  it('hides the guide on f5-mama (the real motor-memory exam) and on the free level', () => {
    for (const level of LEVELS) {
      // `f1-libre` has nothing to show; `f5-mama` has something and hides it.
      expect(level.showGuide).toBe(level.id !== 'f5-mama' && level.id !== 'f1-libre')
    }
  })

  it('declares the letters of phases 3-5 and none for phases 1-2', () => {
    expect(getLevel('f3-a').letters).toEqual(['a'])
    expect(getLevel('f4-la').letters).toEqual(['l', 'a'])
    expect(getLevel('f5-mama').letters).toEqual(['m', 'a', 'm', 'a'])
    for (const level of LEVELS) {
      if (level.phase <= 2) expect(level.letters).toEqual([])
      else expect(level.letters.length).toBeGreaterThan(0)
    }
  })
})

describe('LEVELS — surface, kind and feedback', () => {
  it('draws NO pauta in phases 1-2 and the pauta from phase 3 on', () => {
    // The ruled lines only start meaning something when zone is the lesson
    // (docs/01 phase 3). Before that they are noise against principle 1.
    for (const level of LEVELS) {
      expect(level.surface).toBe(level.phase <= 2 ? 'blank' : 'ruled')
    }
  })

  it('has exactly one free level, and it is the very first thing the child does', () => {
    const free = LEVELS.filter((l) => l.kind === 'free')
    expect(free.map((l) => l.id)).toEqual(['f1-libre'])
    expect(LEVELS[0].id).toBe('f1-libre')
    expect(free[0].paths).toEqual([])
    expect(free[0].phase).toBe(1)
  })

  it('renders only the phase-1 routes as real mazes', () => {
    // "Laberinto" means walls knocked out of a solid field. A phase-2 garland
    // is a movement, not a maze, so it stays a soft corridor.
    for (const level of LEVELS) {
      expect(level.maze).toBe(level.phase === 1 && level.kind === 'path')
    }
  })

  it('metronomes phase 2 and only phase 2, between 50 and 70 bpm where it beats at all', () => {
    for (const level of LEVELS) {
      if (level.phase !== 2) {
        expect(level.feedback.metronomeBpm).toBe(0)
        continue
      }
      // `f2-agua4` is the one named exemption (see the guard below): its beat
      // is silenced on purpose, not a hole in the 50-70 rule.
      if (level.feedback.metronomeBpm === 0) continue
      expect(level.feedback.metronomeBpm).toBeGreaterThanOrEqual(50)
      expect(level.feedback.metronomeBpm).toBeLessThanOrEqual(70)
    }
  })

  it('silences the beat and the fluency bar on exactly the level that asks the child to STOP', () => {
    // design.md §3's exact exemption guard: a named guard so the one silent
    // level cannot become an unguarded hole for a future level to hide in.
    const silent = levelsByPhase(2).filter((l) => l.feedback.metronomeBpm === 0)
    expect(silent.map((l) => l.id)).toEqual(['f2-agua4'])
    expect(silent[0].obstacles).toHaveLength(1)
    expect(silent[0].rules.minFluency).toBe(0)
  })

  it('slows the beat down as the pattern cycle gets longer', () => {
    // One beat = one cycle: the three-cycle patterns cover more ground per
    // beat than the four-cycle ones, so they must be slower.
    const bpm = (id: string): number => getLevel(id).feedback.metronomeBpm
    expect(bpm('f2-agua2')).toBeGreaterThan(bpm('f2-guirnalda'))
    expect(bpm('f2-colinas')).toBeGreaterThan(bpm('f2-crestas'))
    expect(bpm('f2-crestas')).toBeGreaterThan(bpm('f2-bucles'))
  })

  it('turns the assisted rail on at FIRST CONTACT only', () => {
    // docs/03 section 6: the rail is the first-contact assist. Left on it stops
    // being an assist and becomes the child's motor plan. `duck-trail1` is now
    // the first routed level of phase 1 (the duck case precedes `trail1`), so
    // it inherits the role `f1-travesia`/`trail1` used to carry.
    const railed = LEVELS.filter((l) => l.feedback.rail).map((l) => l.id)
    expect(railed).toEqual(['duck-trail1', 'f3-l'])
    expect(levelsByPhase(1).filter((l) => l.kind === 'path')[0].id).toBe('duck-trail1')
    expect(levelsByPhase(3)[0].id).toBe('f3-l')
  })

  it('sounds and buzzes on every level with a corridor, and on none without one', () => {
    for (const level of LEVELS) {
      const hasCorridor = level.kind === 'path'
      expect(level.feedback.tone).toBe(hasCorridor)
      expect(level.feedback.haptics).toBe(hasCorridor)
    }
  })

  it('narrows duck-trail4, trail 1 and trail 4, and never in a direction that widens', () => {
    const tapered = LEVELS.filter((l) => l.taper)
    expect(tapered.map((l) => l.id)).toEqual(['duck-trail4', 'trail1', 'trail4'])
    for (const level of tapered) {
      expect(level.taper?.from).toBeGreaterThan(level.taper?.to ?? Infinity)
    }
  })
})

describe('LEVELS — hazards and reset', () => {
  it('resets the run on every case trail and on the one level with a hazard', () => {
    // `resetOnContact` is a RULE, not a punishment (types.ts). Every trail in
    // both cases sets it — touching the border sends the glass back to the
    // start, exactly the case-file mechanic the brief specifies — and so does
    // `f2-agua4`, the one Nivel 3 level with a hazard on it.
    const resetting = LEVELS.filter((l) => l.resetOnContact).map((l) => l.id)
    expect(resetting).toEqual([
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'trail1',
      'trail2',
      'trail3',
      'trail4',
      'f2-agua4',
    ])
  })

  it('gives every detective trail the fingertip carrier — it is the magnifying glass', () => {
    // The glass following the fingertip IS the mode: "controlas una lupa ...
    // cuando la agarras te empieza a seguir el dedo". This shipped false for
    // one slice because `LevelPlay` had not been wired to pass `carrierArt`,
    // and a test asserting that gap kept the suite green while the central
    // mechanic was missing. It is wired now; `LevelPlay.test.tsx` asserts the
    // prop reaches the canvas, and this asserts the trails ask for it.
    for (const level of LEVELS) {
      if (level.clue) expect(level.carrier, `${level.id} has no glass`).toBe(true)
    }
  })

  it('puts hazards on trail 1 and f2-agua4, and exactly one each (design C3, §4)', () => {
    const hazardous = LEVELS.filter((l) => (l.obstacles?.length ?? 0) > 0)
    expect(hazardous.map((l) => l.id)).toEqual(['trail1', 'f2-agua4'])
    for (const level of hazardous) expect(level.obstacles).toHaveLength(1)
    // A hazard without the reset rule is an animation, not an obstacle.
    for (const level of LEVELS) {
      if ((level.obstacles?.length ?? 0) > 0) expect(level.resetOnContact).toBe(true)
    }
  })

  it('sits every hazard well inside its route, with room to approach and stop', () => {
    for (const id of ['trail1', 'f2-agua4']) {
      const obstacles = getLevel(id).obstacles ?? []
      expect(obstacles, id).toHaveLength(1)
      expect(obstacles[0].at, id).toBeGreaterThan(0.15)
      expect(obstacles[0].at, id).toBeLessThan(0.85)
    }
  })

  it('runs every hazard slowly enough for a six-year-old to read and plan', () => {
    // Band widened from trail1's own 2200-2800/26-34 to admit f2-agua4's
    // slower, wider starfish (periodMs 3000, radius 34) — design.md §4's
    // numbers, deliberately not trail1's own literals (D3).
    for (const id of ['trail1', 'f2-agua4']) {
      for (const o of getLevel(id).obstacles ?? []) {
        expect(o.periodMs, id).toBeGreaterThanOrEqual(2200)
        expect(o.periodMs, id).toBeLessThanOrEqual(3200)
        expect(o.radius, id).toBeGreaterThanOrEqual(26)
        expect(o.radius, id).toBeLessThanOrEqual(36)
      }
    }
  })

  it("gives f2-agua4 a real, majority gap to stop and go in (design.md §4)", () => {
    const level = getLevel('f2-agua4')
    const o = (level.obstacles ?? [])[0]
    expect(hazardGapFraction(o, level.corridorWidth)).toBeGreaterThan(0.5)
  })
})

describe('LEVELS — Nivel 3 and every garland/hills level clears the ideal band (design.md §2)', () => {
  // Below this radius of curvature, `pushBand`'s fixed ±half offset
  // (`buildLevel.ts`) folds through itself on the concave side of a U turn.
  // Widths/depths restate each level's own generator-call literals above, so
  // this ties the live `corridorWidth` field to the geometry: the two cannot
  // silently drift apart without this failing.
  const CASES: Array<{ id: string; width: number; depth: number }> = [
    { id: 'f2-guirnalda', width: (880 - 120) / 3, depth: 430 - 190 },
    { id: 'f2-agua2', width: (880 - 120) / 4, depth: 430 - 290 },
    { id: 'f2-agua4', width: (880 - 120) / 3, depth: 430 - 190 },
    { id: 'f2-colinas', width: (860 - 140) / 4, depth: 435 - 285 },
  ]

  it('keeps the authored width safely wider than the U turning radius', () => {
    for (const { id, width, depth } of CASES) {
      const level = getLevel(id)
      expect(uTurnRadius(width, depth), id).toBeGreaterThan(level.corridorWidth / 2 - BAND_INSET)
    }
  })

  it("holds even at desafío 3's tightest cycle, at the design's own 4.5-unit margin", () => {
    // The {165, 170} cycle is the worst of f2-agua3's five varied U's.
    const level = getLevel('f2-agua3')
    const floor = level.corridorWidth / 2 - BAND_INSET
    const radius = uTurnRadius(165, 170)
    expect(radius).toBeGreaterThan(floor)
    expect(radius - floor).toBeCloseTo(4.5, 1)
  })
})

describe('LEVELS — phase 1 uses the whole blank sheet', () => {
  /** Vertical extent of every path of a level, in viewBox units. */
  function verticalSpan(level: (typeof LEVELS)[number]): { minY: number; maxY: number } {
    let minY = Infinity
    let maxY = -Infinity
    for (const d of level.paths) {
      for (const p of flattenPathD(d).points) {
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
    }
    return { minY, maxY }
  }

  it('puts no phase-1 route inside the writing band', () => {
    // The band is 300-420. A route that fits inside it trains the fingertip;
    // phase 1 exists to train the arm (docs/01 phase 1).
    for (const level of levelsByPhase(1)) {
      if (level.kind !== 'path') continue
      const { minY, maxY } = verticalSpan(level)
      expect(maxY - minY, `${level.id} must be taller than the writing band`).toBeGreaterThan(300)
      expect(minY, `${level.id} must reach above the middle line`).toBeLessThan(180)
      expect(maxY, `${level.id} must reach below the baseline`).toBeGreaterThan(420)
    }
  })

  it('keeps every phase-1 route on the paper', () => {
    for (const level of levelsByPhase(1)) {
      if (level.kind !== 'path') continue
      const { minY, maxY } = verticalSpan(level)
      expect(minY).toBeGreaterThanOrEqual(0)
      expect(maxY).toBeLessThanOrEqual(600)
    }
  })

  it('keeps phase 2 in the writing band — those ARE letter shapes', () => {
    for (const level of levelsByPhase(2)) {
      const { minY, maxY } = verticalSpan(level)
      // 150-450 is the 1.25x band the patterns are scaled to (paths.ts); the
      // loop apex overshoots its own top line by under a unit.
      expect(minY, `${level.id}`).toBeGreaterThanOrEqual(149)
      expect(maxY, `${level.id}`).toBeLessThanOrEqual(451)
    }
  })
})

describe('LEVELS — every path is engine-ready', () => {
  it('has non-empty paths that flatten into a real polyline', () => {
    for (const level of LEVELS) {
      if (level.kind === 'free') {
        expect(level.paths).toEqual([])
        continue
      }
      expect(level.paths.length).toBeGreaterThan(0)
      for (const d of level.paths) {
        expect(typeof d).toBe('string')
        expect(d.trim().length).toBeGreaterThan(0)
        expect(() => flattenPathD(d)).not.toThrow()
        expect(flattenPathD(d).points.length).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('builds a usable target for every routed level', () => {
    for (const level of LEVELS) {
      if (level.kind === 'free') continue
      const target = buildLevelTarget(level)
      expect(target.length).toBeGreaterThan(100)
      expect(target.ideal.length).toBeGreaterThan(0)
      expect(target.checkpoints.length).toBeGreaterThanOrEqual(6)
      target.checkpoints.forEach((cp, i) => expect(cp.order).toBe(i + 1))
      expect(target.corridorWidth).toBeGreaterThan(0)
    }
  })

  it('degrades no level at import time', () => {
    // A non-empty list means an authoring regression: a letter left the
    // registry, or a word member stopped being word-eligible.
    expect(DEGRADED_LEVEL_IDS).toEqual([])
  })
})

describe('getLevel', () => {
  it('returns the level by id', () => {
    expect(getLevel('f2-bucles').title).toBe('Los rulos altos')
  })

  it('throws for an unknown id', () => {
    expect(() => getLevel('no-existe')).toThrow('Nivel no encontrado: no-existe')
  })
})

describe('levelsByPhase', () => {
  it('groups the catalog by phase', () => {
    expect(levelsByPhase(1).map((l) => l.id)).toEqual([
      'f1-libre',
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'trail1',
      'trail2',
      'trail3',
      'trail4',
    ])
    expect(levelsByPhase(4).map((l) => l.id)).toEqual(['f4-la', 'f4-ma'])
    expect(levelsByPhase(5)).toHaveLength(2)
    const total = ([1, 2, 3, 4, 5] as Phase[]).reduce((n, p) => n + levelsByPhase(p).length, 0)
    expect(total).toBe(LEVELS.length)
  })
})

describe('nextLevelId', () => {
  it('walks the whole catalog and stops at the end', () => {
    const walked: string[] = [LEVELS[0].id]
    let current: string | null = LEVELS[0].id
    while (current !== null) {
      current = nextLevelId(current)
      if (current !== null) walked.push(current)
      expect(walked.length).toBeLessThanOrEqual(LEVELS.length) // no cycles
    }
    expect(walked).toEqual(EXPECTED_IDS)
  })

  it('returns null on the last level and for an unknown id', () => {
    expect(nextLevelId('f5-mama')).toBeNull()
    expect(nextLevelId('no-existe')).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// `detective-mode` Phase 10/11 requirements (level-engine spec "Phase-1 Trail
// Set and Arc-Length Floor" / "Square-Wave Corner Constraint" / "f1-libre
// Retheme Carries No Clue").
// ─────────────────────────────────────────────────────────────────────────────
describe('detective-mode — four trails replace the six corridor levels', () => {
  it('lists exactly the four trail ids in LEVELS, none of the six removed ones', () => {
    const phase1Ids = levelsByPhase(1).map((l) => l.id)
    expect(phase1Ids).toEqual(['f1-libre', ...DUCK_TRAIL_IDS, ...DETECTIVE_TRAIL_IDS])
    for (const removed of REMOVED_IDS) expect(phase1Ids).not.toContain(removed)
  })

  it('carries exactly one clue kind per trail, no clue on f1-libre', () => {
    const KINDS: Record<string, string> = {
      trail1: 'droplet',
      trail2: 'corn',
      trail3: 'footprint',
      trail4: 'feather',
    }
    for (const id of DETECTIVE_TRAIL_IDS) {
      const level = getLevel(id)
      expect(level.clue?.kind).toBe(KINDS[id])
    }
    expect(getLevel('f1-libre').clue).toBeUndefined()
  })

  it('spaces clue marks by arc length, one every 55-70 units on every trail (defect fix: density must read the same on a short trail and a long one, not a level-length-agnostic fixed count)', () => {
    for (const id of DETECTIVE_TRAIL_IDS) {
      const level = getLevel(id)
      const spacing = level.clue?.spacing
      expect(spacing, `${id}: no clue.spacing authored`).toBeGreaterThanOrEqual(55)
      expect(spacing, `${id}: no clue.spacing authored`).toBeLessThanOrEqual(70)

      // The actual gap `clueMarks` produces on this trail's REAL geometry —
      // `clueCountFor`'s count turns into marks at `length / (count + 1)`
      // apart — must land close to the authored spacing, not just the
      // authored number itself.
      const target = buildLevelTarget(level)
      const count = clueCountFor(target.length, spacing as number)
      const actualGap = target.length / (count + 1)
      expect(actualGap, `${id}: actual mark spacing drifted from the target`).toBeGreaterThanOrEqual(50)
      expect(actualGap, `${id}: actual mark spacing drifted from the target`).toBeLessThanOrEqual(75)
      // Dense enough to read as a walked track, not a handful of pickups.
      expect(count).toBeGreaterThanOrEqual(20)
    }
  })

  it('sets demo: true on every trail, so the animated route replaces the removed hint sentence (C1)', () => {
    for (const id of DETECTIVE_TRAIL_IDS) expect(getLevel(id).demo).toBe(true)
  })

  it('keeps f1-libre at index 0, unchanged mechanically (kind free, no corridor)', () => {
    expect(LEVELS[0].id).toBe('f1-libre')
    expect(LEVELS[0].kind).toBe('free')
    expect(LEVELS[0].paths).toEqual([])
  })
})

describe('detective-mode — LEGACY_PHASE_1 preserves the removed configs', () => {
  it('exports all six removed level configs, unwired from LEVELS', () => {
    expect(LEGACY_PHASE_1.map((l) => l.id)).toEqual(REMOVED_IDS)
    for (const removed of REMOVED_IDS) {
      expect(LEVELS.map((l) => l.id)).not.toContain(removed)
    }
  })

  it('keeps the removed configs\' authored shape unchanged', () => {
    const CORRIDORS: Record<string, number> = {
      'f1-travesia': 120,
      'f1-pelotas': 84,
      'f1-paseo': 68,
      'f1-pasillo': 56,
      'f1-ondas': 95,
      'f1-espiral': 70,
    }
    for (const level of LEGACY_PHASE_1) {
      expect(level.phase).toBe(1)
      expect(level.corridorWidth).toBe(CORRIDORS[level.id])
      expect(level.clue).toBeUndefined()
    }
    // Every removed config still produces a real, engine-buildable target — a
    // mutation that broke one of them would be visible here even though
    // LEGACY_PHASE_1 is unwired from play.
    for (const level of LEGACY_PHASE_1) {
      const target = buildLevelTarget(level)
      expect(target.length).toBeGreaterThan(100)
    }
  })
})

describe('detective-mode — total arc length does not regress', () => {
  it('sums at least as long as the six removed levels', () => {
    const trailTotal = DETECTIVE_TRAIL_IDS.reduce(
      (sum, id) => sum + buildLevelTarget(getLevel(id)).length,
      0,
    )
    const removedTotal = LEGACY_PHASE_1.reduce((sum, l) => sum + buildLevelTarget(l).length, 0)
    expect(trailTotal).toBeGreaterThanOrEqual(removedTotal)
  })
})

describe('detective-mode — coil trail keeps its corridor narrower than the radial gap (D2)', () => {
  /**
   * Measures the spiral's radial gap directly from `spiral()`'s own RAW
   * output (its documented default centre `(500, 300)`, `paths.ts`), rather
   * than re-typing its private `rStart`/`rEnd`/`turns` defaults as numbers:
   * min/max radius from that centre, and the total angle swept (unwrapped),
   * give the radial gap per full turn purely from the generated geometry. A
   * mutation that narrowed the coil's turns, or widened trail 2's
   * `corridorWidth` past the real gap, fails this — not a synthetic
   * recomputation of constants that live in a file this slice does not own.
   * Trail 2's config passes `spiral()` with no overrides, so this default
   * centre is exactly what it renders with.
   */
  function measureRadialGap(polyline: ReadonlyArray<{ x: number; y: number }>): number {
    const cx = 500
    const cy = 300
    let minR = Infinity
    let maxR = -Infinity
    let totalAngle = 0
    let prevAngle = Math.atan2(polyline[0].y - cy, polyline[0].x - cx)
    for (const p of polyline) {
      const r = Math.hypot(p.x - cx, p.y - cy)
      if (r < minR) minR = r
      if (r > maxR) maxR = r
    }
    for (let i = 1; i < polyline.length; i++) {
      const angle = Math.atan2(polyline[i].y - cy, polyline[i].x - cx)
      let delta = angle - prevAngle
      if (delta > Math.PI) delta -= 2 * Math.PI
      if (delta < -Math.PI) delta += 2 * Math.PI
      totalAngle += delta
      prevAngle = angle
    }
    const turns = Math.abs(totalAngle) / (2 * Math.PI)
    return (maxR - minR) / turns
  }

  it('keeps corridorWidth strictly under the measured radial gap', () => {
    const level = getLevel('trail2')
    expect(level.paths).toEqual([spiral()]) // no override — the default centre applies
    const radialGap = measureRadialGap(flattenPathD(spiral()).points)
    expect(radialGap).toBeGreaterThan(100) // sanity: matches the documented ~120
    expect(level.corridorWidth).toBeLessThan(radialGap)
  })
})

describe('detective-mode — square-wave corner constraint on the real trail 4 config', () => {
  it('satisfies both cornerClearance and armClearance measured from the shipped path', () => {
    const level = getLevel('trail4')
    const target = buildLevelTarget(level)
    // `squareWave` emits exactly `1 + 4·cycles` vertices: M, then per cycle
    // (top-run, down-transition, bottom-run, up-transition). Measuring the
    // first flat run and the first vertical transition directly from the
    // real polyline — rather than re-typing `run`/`amplitude` — means a
    // future edit to trail 4's geometry is what this test actually checks.
    const [p0, p1, p2] = target.polyline
    expect(p0.y).toBeCloseTo(p1.y) // p0→p1 is the flat top run
    expect(p1.x).toBeCloseTo(p2.x) // p1→p2 is the vertical transition
    const run = Math.abs(p1.x - p0.x)
    const amplitude = Math.abs(p2.y - p1.y) / 2
    expect(cornerClearance(run, 90, level.corridorWidth)).toBe(true)
    expect(armClearance(amplitude, level.corridorWidth)).toBe(true)
  })
})

describe('detective-mode — duck-trail4 clears the corner and arm guards at its narrower width', () => {
  it('satisfies both cornerClearance and armClearance measured from the shipped path (design.md §3)', () => {
    const level = getLevel('duck-trail4')
    const target = buildLevelTarget(level)
    const [p0, p1, p2] = target.polyline
    expect(p0.y).toBeCloseTo(p1.y) // p0→p1 is the flat top run
    expect(p1.x).toBeCloseTo(p2.x) // p1→p2 is the vertical transition
    const run = Math.abs(p1.x - p0.x)
    const amplitude = Math.abs(p2.y - p1.y) / 2
    expect(cornerClearance(run, 90, level.corridorWidth)).toBe(true)
    expect(armClearance(amplitude, level.corridorWidth)).toBe(true)
  })
})

describe('detective-mode — progress migration reaches a mid-campaign child with no locked dead end', () => {
  /** In-memory storage double — mirrors `game/levelProgress.test.ts`'s own. */
  function fakeStorage(): StorageLike {
    let value: string | null = null
    return {
      getItem: () => value,
      setItem: (_key, v) => {
        value = v
      },
    }
  }

  function record(over: Partial<LevelRecord> = {}): LevelRecord {
    return { ...EMPTY_RECORD, ...over }
  }

  it('unlocks trail3 for a child who had passed f1-travesia and f1-pelotas, and leaves an orphan id untouched', () => {
    const storage = fakeStorage()
    const store = new LevelProgressStore(storage)
    // A child mid-way through the OLD phase 1: two full approvals each on
    // the first two removed levels, plus a stray record on an id with no
    // successor (`f1-ondas`), exactly like `LevelProgressStore.ts`'s
    // existing unknown-id tolerance already permits.
    store.save('f1-travesia', record({ approvals: 2, bestAccuracy: 91 }))
    store.save('f1-pelotas', record({ approvals: 2, bestAccuracy: 88 }))
    store.save('f1-ondas', record({ approvals: 1, bestAccuracy: 70 }))

    // Before migration: the D3 bug, made concrete against the REAL catalog —
    // trail3's predecessor (trail2) has no record yet, so it reads locked.
    expect(store.isUnlocked('trail3')).toBe(false)

    const changed = migratePhase1(store.all())
    for (const [id, r] of Object.entries(changed)) store.save(id, r)

    // After migration: trail1 and trail2 both carry the copied-forward
    // approvals, so trail3 — the level this child was actually about to
    // play next — is reachable.
    expect(store.get('trail1').approvals).toBe(2)
    expect(store.get('trail2').approvals).toBe(2)
    expect(store.isUnlocked('trail3')).toBe(true)
    // trail4 stays locked — nothing seeded it (f1-paseo was never played).
    expect(store.isUnlocked('trail4')).toBe(false)

    // The removed ids' own records are untouched, including the orphan with
    // no defined replacement (level-engine spec, "Unrelated ids remain
    // untouched").
    expect(store.get('f1-travesia').approvals).toBe(2)
    expect(store.get('f1-pelotas').approvals).toBe(2)
    expect(store.get('f1-ondas')).toEqual(record({ approvals: 1, bestAccuracy: 70 }))
  })

  it('never demotes a child already past the whole old phase 1', () => {
    const storage = fakeStorage()
    const store = new LevelProgressStore(storage)
    store.save('f1-libre', record({ approvals: 2 }))
    for (const id of REMOVED_IDS.slice(0, 4)) store.save(id, record({ approvals: 2 }))

    // Both migrations apply, in either order (they share no id): the phase-1
    // retheme migration AND the duck-case insertion migration, which is what
    // protects `trail1`'s new positional predecessor (`duck-trail4`).
    for (const migrated of [migratePhase1(store.all()), migrateDuckCase(store.all())]) {
      for (const [id, r] of Object.entries(migrated)) store.save(id, r)
    }

    for (const id of DUCK_TRAIL_IDS) {
      expect(store.isUnlocked(id)).toBe(true)
    }
    for (const id of DETECTIVE_TRAIL_IDS) {
      expect(store.isUnlocked(id)).toBe(true)
    }
  })
})
