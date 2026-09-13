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
import { SECTOR_ADVENTURE_ART } from '../detective/assets'
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
import { ADVENTURES } from '../zoo/adventures'
import {
  armClearance,
  cornerClearance,
  peakRidgeCorridorLimit,
  spiral,
  uTurnRadius,
  waveCrestRadius,
} from './paths'
import { DRAWN_SPINE } from './artCorridor'
import type { Phase } from './types'

// docs/08 section 5 tables, after the detective-mode retheme and the reveal
// grid (design.md §5.1, ratified amendment A1): 8 entrance reveal levels
// (glass + sand) + 1 libre + 4 rastros del pato + 4 detective trails +
// 4 patrones + 4 night reveal levels + 3 desafíos del agua + 4 grafemas +
// 2 enlaces + 2 palabras. `LEVELS[0]` is `glass1`, not `f1-libre`.
const EXPECTED_IDS = [
  'glass1',
  'glass2',
  'glass3',
  'glass4',
  'sand1',
  'sand2',
  'sand3',
  'sand4',
  'f1-libre',
  'duck-trail1',
  'duck-trail2',
  'duck-trail3',
  'duck-trail4',
  'trail1',
  'trail2',
  'trail3',
  'trail4',
  'sheep-hill1',
  'sheep-hill2',
  'sheep-hill3',
  'sheep-hill4',
  'llama-peak1',
  'llama-peak2',
  'llama-peak3',
  'llama-peak4',
  'night1',
  'night2',
  'night3',
  'night4',
  'snake1',
  'snake2',
  'snake3',
  'snake4',
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
    // The twelve reveal-grid levels have no corridor at all (design.md §5.2:
    // f1-libre's exact shape but for haptics) — `corridorWidth: 0` on every
    // one, same as f1-libre.
    'glass1': 0,
    'glass2': 0,
    'glass3': 0,
    'glass4': 0,
    'sand1': 0,
    'sand2': 0,
    'sand3': 0,
    'sand4': 0,
    'night1': 0,
    'night2': 0,
    'night3': 0,
    'night4': 0,
    'snake1': 48,
    'snake2': 42,
    'snake3': 36,
    'snake4': 32,
    'f1-libre': 0,
    'duck-trail1': 100,
    'duck-trail2': 90,
    'duck-trail3': 80,
    'duck-trail4': 70,
    trail1: 90,
    trail2: 70,
    trail3: 90,
    trail4: 70,
    'sheep-hill1': 100,
    'sheep-hill2': 90,
    'sheep-hill3': 80,
    'sheep-hill4': 60,
    'llama-peak1': 90,
    'llama-peak2': 80,
    'llama-peak3': 70,
    'llama-peak4': 60,
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
    // The twelve reveal-grid levels carry no fluency bar either — `rules(1,
    // false, false, 0)`'s own `minFluency: 0`, same as f1-libre.
    'glass1': 0,
    'glass2': 0,
    'glass3': 0,
    'glass4': 0,
    'sand1': 0,
    'sand2': 0,
    'sand3': 0,
    'sand4': 0,
    'night1': 0,
    'night2': 0,
    'night3': 0,
    'night4': 0,
    'snake1': 0,
    'snake2': 0,
    'snake3': 0,
    'snake4': 0,
    'f1-libre': 0,
    'duck-trail1': 0,
    'duck-trail2': 0,
    'duck-trail3': 0,
    'duck-trail4': 0,
    trail1: 0,
    trail2: 0,
    trail3: 0,
    trail4: 0,
    'sheep-hill1': 0,
    'sheep-hill2': 0,
    'sheep-hill3': 0,
    'sheep-hill4': 0,
    'llama-peak1': 0,
    'llama-peak2': 0,
    'llama-peak3': 0,
    'llama-peak4': 0,
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

  it('scales minAccuracy by phase: 55 / 60 / 65, except the twelve reveal-grid levels and the snake family', () => {
    // The reveal-grid levels deliberately OVERRIDE the phase default with
    // their own authored, per-adventure-rising `minAccuracy` (design.md
    // §5.2/§5.3's R1) — their own progression is asserted separately below
    // ("LEVELS — the reveal grid's twelve authored levels"). The snake
    // family does the same (55/62/70/76, `snake-drag-and-art-corridor`
    // design.md §6.2 R2) — asserted in its own describe block below.
    for (const level of LEVELS) {
      if (level.reveal) continue
      if (level.artCorridor) continue
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

  it('hides the guide on f5-mama (the real motor-memory exam) and on every free level', () => {
    for (const level of LEVELS) {
      // `f1-libre` and the twelve reveal-grid levels have nothing to show
      // (`kind: 'free'`, no path); `f5-mama` has something and hides it.
      expect(level.showGuide).toBe(level.id !== 'f5-mama' && level.kind !== 'free')
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

  it('has exactly one free level with no reveal grid, and the catalog opens with the entrance', () => {
    // Amended, not deleted (design.md §5.1, ratified amendment A1): before
    // the reveal grid, `kind: 'free'` meant "the warm-up," and `f1-libre` was
    // both the only free level AND `LEVELS[0]`. Now thirteen levels are
    // `kind: 'free'` (level-engine spec "`kind: 'free'` Means 'No Route,'
    // Not 'The Warm-Up'"): `f1-libre`, still with no `reveal` field, and the
    // twelve reveal-grid levels, each with one. The catalog's first entry is
    // `glass1`, the app's real opening.
    const free = LEVELS.filter((l) => l.kind === 'free')
    expect(free.filter((l) => !l.reveal).map((l) => l.id)).toEqual(['f1-libre'])
    expect(free).toHaveLength(13)
    expect(LEVELS[0].id).toBe('glass1')
    // Closes the forward reference task 4.8 named (`AdventureId`/`ADVENTURES`
    // only gained a `'glass'` row in Phase 5's task 5.1) — design.md §5.1's
    // exact test snippet, now compiling for real.
    expect(ADVENTURES.find((a) => a.id === 'glass')!.levelIds[0]).toBe('glass1')
    for (const l of free) expect(l.paths, l.id).toEqual([])
    for (const l of free) expect(l.phase, l.id).toBe(1)
  })

  it('renders only the phase-1 routes as real mazes', () => {
    // "Laberinto" means walls knocked out of a solid field. A phase-2 garland
    // is a movement, not a maze, so it stays a soft corridor. The snake
    // family is the one NAMED exception (design.md §6.1): its corridor is a
    // drawn cutout over a sand hollow, not a wall knocked out of a field —
    // `maze: false` on all four is deliberate, not an oversight.
    for (const level of LEVELS) {
      if (level.artCorridor) {
        expect(level.maze, level.id).toBe(false)
        continue
      }
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
    expect(railed).toEqual(['duck-trail1', 'sheep-hill1', 'f3-l'])
    expect(levelsByPhase(1).filter((l) => l.kind === 'path')[0].id).toBe('duck-trail1')
    expect(levelsByPhase(3)[0].id).toBe('f3-l')
  })

  it('sounds and buzzes on every level with a corridor — and buzzes without one on the reveal grid', () => {
    // A found gap in this guard, not called out by tasks.md's own reveal-grid
    // task list: the twelve reveal-grid levels are `kind: 'free'` (no
    // corridor) but deliberately keep `haptics: true` (design.md §5.2 — "a
    // tile clearing under the finger is a contact worth feeling"). Amended,
    // not deleted: `tone` still tracks having a corridor exactly as before;
    // `haptics` is now `hasCorridor OR reveal-bearing`.
    for (const level of LEVELS) {
      const hasCorridor = level.kind === 'path'
      expect(level.feedback.tone).toBe(hasCorridor)
      expect(level.feedback.haptics).toBe(hasCorridor || !!level.reveal)
    }
  })

  it('narrows duck-trail4, trail 1 and trail 4, and never in a direction that widens', () => {
    const tapered = LEVELS.filter((l) => l.taper)
    expect(tapered.map((l) => l.id)).toEqual([
      'duck-trail4',
      'trail1',
      'trail4',
      'sheep-hill4',
      'llama-peak4',
    ])
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
      'sheep-hill1',
      'sheep-hill2',
      'sheep-hill3',
      'sheep-hill4',
      'llama-peak1',
      'llama-peak2',
      'llama-peak3',
      'llama-peak4',
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

describe('LEVELS — the duck adventure is one undulation family', () => {
  // Restated from each duck level's own catalog literals (design.md §1's
  // table), not re-derived from geometry — this pins the AUTHORED progression,
  // not just an emergent property of whatever shape happens to be there.
  const PEAK_SLOPE_INPUTS: ReadonlyArray<{ id: string; halfWidth: number; amplitude: number }> = [
    { id: 'duck-trail1', halfWidth: (910 - 90) / 2, amplitude: 170 },
    { id: 'duck-trail2', halfWidth: (910 - 90) / (2 * 2), amplitude: 170 },
    // duck-trail3's tighter, higher second cycle is the one that sets its
    // peak slope (waveVaried's cycles differ; the family compares its worst).
    { id: 'duck-trail3', halfWidth: 350 / 2, amplitude: 205 },
    { id: 'duck-trail4', halfWidth: (910 - 90) / (2 * 3), amplitude: 170 },
  ]

  it('gives every duck level exactly one M/C-only path (no switchback, no square wave)', () => {
    for (const id of DUCK_TRAIL_IDS) {
      const level = getLevel(id)
      expect(level.paths, id).toHaveLength(1)
      const commands = new Set(level.paths[0].match(/[A-Za-z]/g))
      for (const c of commands) expect(['M', 'C'], id).toContain(c)
    }
  })

  it('increases peak slope (4A/halfWidth) strictly across the four steps', () => {
    const slopes = PEAK_SLOPE_INPUTS.map(({ halfWidth, amplitude }) =>
      (4 * amplitude) / halfWidth,
    )
    expect(slopes[0]).toBeCloseTo(1.66, 2)
    expect(slopes[1]).toBeCloseTo(3.32, 2)
    expect(slopes[2]).toBeCloseTo(4.69, 2)
    expect(slopes[3]).toBeCloseTo(4.98, 2)
    for (let i = 1; i < slopes.length; i++) expect(slopes[i]).toBeGreaterThan(slopes[i - 1])
  })

  it('decreases corridorWidth strictly across the four steps: 100 → 90 → 80 → 70', () => {
    const widths = DUCK_TRAIL_IDS.map((id) => getLevel(id).corridorWidth)
    expect(widths).toEqual([100, 90, 80, 70])
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThan(widths[i - 1])
  })

  it('keeps duck-trail4 narrower than duck-trail3 along its whole tapered length', () => {
    const trail3 = getLevel('duck-trail3').corridorWidth // 80, fixed (no taper)
    const trail4 = getLevel('duck-trail4')
    const { from, to } = trail4.taper ?? { from: 1, to: 1 }
    expect(trail4.corridorWidth * from).toBeLessThanOrEqual(trail3)
    expect(trail4.corridorWidth * to).toBeLessThan(trail3)
  })

  it("keeps duck-trail3's two crest depths at least 40 units apart (the variation is real)", () => {
    const target = buildLevelTarget(getLevel('duck-trail3'))
    // Cycle 1 (width 470, amplitude 155) starts at x0=90 and spans to x=560;
    // cycle 2 (width 350, amplitude 205) covers the rest — the two crest
    // depths are the furthest-from-centreline points of each half.
    const boundaryX = 90 + 470
    const firstHalf = target.polyline.filter((p) => p.x < boundaryX)
    const secondHalf = target.polyline.filter((p) => p.x >= boundaryX)
    const depth1 = Math.max(...firstHalf.map((p) => Math.abs(p.y - 300)))
    const depth2 = Math.max(...secondHalf.map((p) => Math.abs(p.y - 300)))
    expect(Math.abs(depth2 - depth1)).toBeGreaterThanOrEqual(40)
  })

  it('drops mustBeContinuous on all four duck levels', () => {
    for (const id of DUCK_TRAIL_IDS) expect(getLevel(id).rules.mustBeContinuous, id).toBe(false)
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
    // Amended for the reveal grid (design.md §5.1): eight entrance levels
    // (glass + sand) open phase 1, four night levels close it — a gap this
    // check's own exact-order assertion would otherwise miss silently.
    expect(levelsByPhase(1).map((l) => l.id)).toEqual([
      'glass1',
      'glass2',
      'glass3',
      'glass4',
      'sand1',
      'sand2',
      'sand3',
      'sand4',
      'f1-libre',
      'duck-trail1',
      'duck-trail2',
      'duck-trail3',
      'duck-trail4',
      'trail1',
      'trail2',
      'trail3',
      'trail4',
      'sheep-hill1',
      'sheep-hill2',
      'sheep-hill3',
      'sheep-hill4',
      'llama-peak1',
      'llama-peak2',
      'llama-peak3',
      'llama-peak4',
      'night1',
      'night2',
      'night3',
      'night4',
      'snake1',
      'snake2',
      'snake3',
      'snake4',
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
    // Amended for the reveal grid (design.md §5.1): the eight entrance levels
    // now open phase 1 and the four night levels close it, ahead of/after
    // this describe block's own detective-mode content.
    const phase1Ids = levelsByPhase(1).map((l) => l.id)
    expect(phase1Ids).toEqual([
      'glass1',
      'glass2',
      'glass3',
      'glass4',
      'sand1',
      'sand2',
      'sand3',
      'sand4',
      'f1-libre',
      ...DUCK_TRAIL_IDS,
      ...DETECTIVE_TRAIL_IDS,
      'sheep-hill1',
      'sheep-hill2',
      'sheep-hill3',
      'sheep-hill4',
      'llama-peak1',
      'llama-peak2',
      'llama-peak3',
      'llama-peak4',
      'night1',
      'night2',
      'night3',
      'night4',
      'snake1',
      'snake2',
      'snake3',
      'snake4',
    ])
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

  it('opens the catalog with glass1, and keeps f1-libre mechanically unchanged (kind free, no corridor, no reveal)', () => {
    // Amended, not deleted (design.md §5.1, ratified amendment A1): a second
    // pre-existing guard this exact assertion, distinct from
    // `catalog.test.ts`'s own "has exactly one free level" check above — a
    // found gap tasks.md's own reveal-grid task list did not call out.
    // `LEVELS[0]` is now `glass1`, the app's real opening; `f1-libre` itself
    // is untouched.
    expect(LEVELS[0].id).toBe('glass1')
    const libre = getLevel('f1-libre')
    expect(libre.kind).toBe('free')
    expect(libre.paths).toEqual([])
    expect(libre.reveal).toBeUndefined()
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

// ─────────────────────────────────────────────────────────────────────────────
// Row C (level-engine spec "Sheep vs Llama Height, Slope and Corner
// Invariants"): I1-I4, I6, I7 restated directly over the eight authored
// literals — design.md §1.5, replacing the proposal's unsatisfiable
// per-matched-step mean-slope ordering (design.md §1.5's rationale).
// ─────────────────────────────────────────────────────────────────────────────
describe('LEVELS — the mountain family is one ridge pair', () => {
  const SHEEP_IDS = ['sheep-hill1', 'sheep-hill2', 'sheep-hill3', 'sheep-hill4']
  const LLAMA_IDS = ['llama-peak1', 'llama-peak2', 'llama-peak3', 'llama-peak4']

  // The eight authored height lists, restated directly (not re-derived from
  // geometry) — design.md §1.4's table. `x0`/`x1` (90/910) are frozen for all
  // eight, so the run `r = (x1-x0)/(2*n)` is derivable straight from each
  // list's own length, the same way `peakRidgeCorridorLimit` derives it.
  const HEIGHTS_BY_ID: Record<string, readonly number[]> = {
    'sheep-hill1': [320, 320],
    'sheep-hill2': [320, 320, 320],
    'sheep-hill3': [320, 170, 320],
    'sheep-hill4': [320, 170, 320, 170],
    'llama-peak1': [360],
    'llama-peak2': [360, 180],
    'llama-peak3': [360, 360, 360],
    'llama-peak4': [360, 360, 360, 360],
  }

  /** Every (height, run) pair actually authored across a family's four levels. */
  function legsOf(ids: readonly string[]): ReadonlyArray<{ h: number; r: number }> {
    const legs: { h: number; r: number }[] = []
    for (const id of ids) {
      const heights = HEIGHTS_BY_ID[id]
      const r = (910 - 90) / (2 * heights.length)
      for (const h of heights) legs.push({ h, r })
    }
    return legs
  }

  it('I1: every sheep peak height is shorter than every llama peak height (320,170 < 360,180)', () => {
    // The directive's two distinct heights per family — tall vs tall, short
    // vs short (design.md §1.5's own "320,170 < 360,180" reading, not a full
    // cross product: the sheep's TALL peak (320) is not shorter than the
    // llama's SHORT one (180), and that is not what I1 claims).
    const sheepHeights = [...new Set(SHEEP_IDS.flatMap((id) => HEIGHTS_BY_ID[id]))].sort(
      (a, b) => a - b,
    )
    const llamaHeights = [...new Set(LLAMA_IDS.flatMap((id) => HEIGHTS_BY_ID[id]))].sort(
      (a, b) => a - b,
    )
    expect(sheepHeights).toEqual([170, 320])
    expect(llamaHeights).toEqual([180, 360])
    for (let i = 0; i < sheepHeights.length; i++) {
      expect(sheepHeights[i]).toBeLessThan(llamaHeights[i])
    }
  })

  it('I2: the steepest sheep leg slope is gentler than the steepest llama leg slope (3.122 < 3.512)', () => {
    const steepest = (ids: readonly string[]): number =>
      Math.max(...legsOf(ids).map(({ h, r }) => h / r))
    const sheepSteepest = steepest(SHEEP_IDS)
    const llamaSteepest = steepest(LLAMA_IDS)
    expect(sheepSteepest).toBeCloseTo(3.122, 2)
    expect(llamaSteepest).toBeCloseTo(3.512, 2)
    expect(sheepSteepest).toBeLessThan(llamaSteepest)
  })

  it('I3: the sharpest sheep corner angle is blunter than the sharpest llama corner angle (35.52° > 31.78°)', () => {
    const sharpestAngleDeg = (ids: readonly string[]): number =>
      Math.min(...legsOf(ids).map(({ h, r }) => (2 * Math.atan(r / h) * 180) / Math.PI))
    const sheepSharpest = sharpestAngleDeg(SHEEP_IDS)
    const llamaSharpest = sharpestAngleDeg(LLAMA_IDS)
    expect(sheepSharpest).toBeCloseTo(35.52, 1)
    expect(llamaSharpest).toBeCloseTo(31.78, 1)
    expect(sheepSharpest).toBeGreaterThan(llamaSharpest)
  })

  it('I4: from sheep-hill3 onward, at least one vertex is <= 0.55x that level\'s own tallest (170/320 = 0.531)', () => {
    for (const id of ['sheep-hill3', 'sheep-hill4']) {
      const heights = HEIGHTS_BY_ID[id]
      const tallest = Math.max(...heights)
      expect(Math.min(...heights) / tallest).toBeLessThanOrEqual(0.55)
    }
  })

  it('I5: corridorWidth strictly decreases within each adventure (100/90/80/60, 90/80/70/60)', () => {
    expect(SHEEP_IDS.map((id) => getLevel(id).corridorWidth)).toEqual([100, 90, 80, 60])
    expect(LLAMA_IDS.map((id) => getLevel(id).corridorWidth)).toEqual([90, 80, 70, 60])
  })

  it('I6: llama heights are uniform except llama-peak2, which is [tall, tall/2]', () => {
    expect(HEIGHTS_BY_ID['llama-peak1'].every((h) => h === 360)).toBe(true)
    expect(HEIGHTS_BY_ID['llama-peak2']).toEqual([360, 180])
    expect(HEIGHTS_BY_ID['llama-peak3'].every((h) => h === 360)).toBe(true)
    expect(HEIGHTS_BY_ID['llama-peak4'].every((h) => h === 360)).toBe(true)
  })

  it('I7: peakRidgeCorridorLimit >= corridorWidth * max(taper.from, 1) on all eight', () => {
    for (const id of [...SHEEP_IDS, ...LLAMA_IDS]) {
      const level = getLevel(id)
      const limit = peakRidgeCorridorLimit({ x0: 90, x1: 910, heights: HEIGHTS_BY_ID[id] })
      const taperFrom = level.taper?.from ?? 1
      expect(limit, id).toBeGreaterThanOrEqual(level.corridorWidth * Math.max(taperFrom, 1))
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// The reveal grid (design.md §5, level-engine spec "Twelve Reveal-Grid Levels
// Occupy Fixed Catalog Positions" / "Pedagogical Progression Invariant Per
// Adventure" / "No Demo on Any of the Twelve" / "Docs §6/§14 Checklist
// Coverage for the Twelve Reveal-Grid Levels"). R1-R8 restated directly over
// the twelve authored literals (design.md §5.3), the same style §5.3's own
// table uses for the sheep/llama family above.
// ─────────────────────────────────────────────────────────────────────────────
describe('LEVELS — the reveal grid, twelve authored levels (design.md §5, amendments A1/A2)', () => {
  const GLASS_IDS = ['glass1', 'glass2', 'glass3', 'glass4']
  const SAND_IDS = ['sand1', 'sand2', 'sand3', 'sand4']
  const NIGHT_IDS = ['night1', 'night2', 'night3', 'night4']
  const ALL_REVEAL_IDS = [...GLASS_IDS, ...SAND_IDS, ...NIGHT_IDS]
  const ADVENTURE_FAMILIES = [GLASS_IDS, SAND_IDS, NIGHT_IDS]

  function revealOf(id: string) {
    const level = getLevel(id)
    if (!level.reveal) throw new Error(`${id}: expected a reveal field`)
    return level.reveal
  }

  it('R1: minAccuracy is non-decreasing within each adventure', () => {
    for (const ids of ADVENTURE_FAMILIES) {
      const values = ids.map((id) => getLevel(id).rules.minAccuracy)
      for (let i = 1; i < values.length; i++) {
        expect(values[i], ids[i]).toBeGreaterThanOrEqual(values[i - 1])
      }
    }
    expect(GLASS_IDS.map((id) => getLevel(id).rules.minAccuracy)).toEqual([55, 68, 76, 82])
    expect(SAND_IDS.map((id) => getLevel(id).rules.minAccuracy)).toEqual([60, 70, 78, 85])
    expect(NIGHT_IDS.map((id) => getLevel(id).rules.minAccuracy)).toEqual([100, 100, 100, 100])
  })

  it('R2: radius is non-increasing within each adventure', () => {
    for (const ids of ADVENTURE_FAMILIES) {
      const values = ids.map((id) => revealOf(id).radius)
      for (let i = 1; i < values.length; i++) {
        expect(values[i], ids[i]).toBeLessThanOrEqual(values[i - 1])
      }
    }
    expect(GLASS_IDS.map((id) => revealOf(id).radius)).toEqual([110, 110, 110, 80])
    expect(SAND_IDS.map((id) => revealOf(id).radius)).toEqual([110, 110, 90, 70])
    expect(NIGHT_IDS.map((id) => revealOf(id).radius)).toEqual([200, 170, 140, 110])
  })

  it('R3: cols*rows is non-decreasing within each adventure', () => {
    for (const ids of ADVENTURE_FAMILIES) {
      const values = ids.map((id) => {
        const r = revealOf(id)
        return r.cols * r.rows
      })
      for (let i = 1; i < values.length; i++) {
        expect(values[i], ids[i]).toBeGreaterThanOrEqual(values[i - 1])
      }
    }
  })

  it('R4: the night family object count is non-decreasing (1, 2, 3, 3)', () => {
    const counts = NIGHT_IDS.map((id) => {
      const r = revealOf(id)
      if (r.mode !== 'light') throw new Error(`${id}: expected mode 'light'`)
      return r.objects.length
    })
    expect(counts).toEqual([1, 2, 3, 3])
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
  })

  it('drops the cross-adventure radius ordering — no comparison between sand1/glass4 or night1/sand4', () => {
    // design.md §5.4, ratified amendment A2: an erase radius accumulates
    // cleared area across an attempt, a light radius does not persist
    // anything, so the two are not comparable quantities. Restated as data,
    // not as an assertion that would compare them.
    expect(revealOf('sand1').radius).toBe(110)
    expect(revealOf('glass4').radius).toBe(80)
    expect(revealOf('night1').radius).toBe(200)
    expect(revealOf('sand4').radius).toBe(70)
  })

  it('R5: every level clears the frame budget — ((2R/w_t)+2)*((2R/h_t)+2) <= 64', () => {
    for (const id of ALL_REVEAL_IDS) {
      const r = revealOf(id)
      const tileW = 1000 / r.cols
      const tileH = 600 / r.rows
      const changedTiles = (2 * r.radius / tileW + 2) * (2 * r.radius / tileH + 2)
      expect(changedTiles, id).toBeLessThanOrEqual(64)
    }
  })

  it('R6: none of the twelve sets demo', () => {
    for (const id of ALL_REVEAL_IDS) expect(getLevel(id).demo, id).toBeFalsy()
  })

  it('R7: every light object sits at least size/2+20 inside the sheet', () => {
    for (const id of NIGHT_IDS) {
      const r = revealOf(id)
      if (r.mode !== 'light') throw new Error(`${id}: expected mode 'light'`)
      for (const obj of r.objects) {
        const floor = obj.size / 2 + 20
        expect(Math.min(obj.x, 1000 - obj.x), `${id}: x margin`).toBeGreaterThanOrEqual(floor)
        expect(Math.min(obj.y, 600 - obj.y), `${id}: y margin`).toBeGreaterThanOrEqual(floor)
      }
    }
  })

  it('R8: every grid is 5:3, so every tile is square', () => {
    for (const id of ALL_REVEAL_IDS) {
      const r = revealOf(id)
      expect(1000 / r.cols, id).toBeCloseTo(600 / r.rows, 10)
    }
  })

  it('the catalog opens with glass1..4 immediately followed by sand1..4, then f1-libre', () => {
    expect(LEVELS.slice(0, 9).map((l) => l.id)).toEqual([...GLASS_IDS, ...SAND_IDS, 'f1-libre'])
  })

  it('night1..4 sit between llama-peak4 and snake1 (snake-drag-and-art-corridor design.md §7.1), in order', () => {
    const idx = LEVELS.findIndex((l) => l.id === 'llama-peak4')
    expect(LEVELS.slice(idx + 1, idx + 5).map((l) => l.id)).toEqual(NIGHT_IDS)
    expect(LEVELS[idx + 5]?.id).toBe('snake1')
  })

  it('configures no path on any of the twelve', () => {
    for (const id of ALL_REVEAL_IDS) expect(getLevel(id).paths, id).toEqual([])
  })

  it('resetOnContact stays off on every one of the twelve — no wall to reset from', () => {
    for (const id of ALL_REVEAL_IDS) expect(getLevel(id).resetOnContact, id).toBe(false)
  })

  it('every reveal-grid LevelConfig answers the engine-owned checklist items (docs/13 §6, docs/14 §14)', () => {
    for (const id of ALL_REVEAL_IDS) {
      const r = revealOf(id)
      expect(r.cols, id).toBeGreaterThan(0)
      expect(r.rows, id).toBeGreaterThan(0)
      expect(r.radius, id).toBeGreaterThan(0)
      expect(getLevel(id).rules.minAccuracy, id).toBeGreaterThan(0)
      if (r.mode === 'light') expect(r.objects.length, id).toBeGreaterThan(0)
    }
  })

  it("night's hidden objects reference the registered chest/stone/leaf art, not re-typed literals", () => {
    for (const id of NIGHT_IDS) {
      const r = revealOf(id)
      if (r.mode !== 'light') throw new Error(`${id}: expected mode 'light'`)
      for (const obj of r.objects) {
        expect(
          [SECTOR_ADVENTURE_ART.chest, SECTOR_ADVENTURE_ART.stone, SECTOR_ADVENTURE_ART.leaf],
          `${id}: object art must be one of the registered chest/stone/leaf`,
        ).toContain(obj.art)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The snake family (`snake-drag-and-art-corridor`, design.md §3.2/§6.2). C1-C6
// and R1-R7, asserted directly over the authored literals so the geometry can
// be retuned without this file — or design.md — going stale.
// ─────────────────────────────────────────────────────────────────────────────
const SNAKE_IDS = ['snake1', 'snake2', 'snake3', 'snake4'] as const
const BAND_INSET_C2 = 6

function minPairDistance(a: readonly { x: number; y: number }[], b: readonly { x: number; y: number }[]): number {
  let best = Infinity
  for (const pa of a) {
    for (const pb of b) {
      const d = Math.hypot(pa.x - pb.x, pa.y - pb.y)
      if (d < best) best = d
    }
  }
  return best
}

describe('the snake family — C1-C6 and R1-R7 (design.md §3.2/§6.2)', () => {
  it('R1: corridorWidth is strictly decreasing across snake1..4', () => {
    const widths = SNAKE_IDS.map((id) => getLevel(id).corridorWidth)
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThan(widths[i - 1])
  })

  it('R2: minAccuracy is strictly increasing across snake1..4', () => {
    const accuracies = SNAKE_IDS.map((id) => getLevel(id).rules.minAccuracy)
    for (let i = 1; i < accuracies.length; i++) expect(accuracies[i]).toBeGreaterThan(accuracies[i - 1])
  })

  it('R3: every level holds exactly 3 paths and 3 artCorridor pieces, smallest to largest', () => {
    for (const id of SNAKE_IDS) {
      const level = getLevel(id)
      expect(level.paths.length, id).toBe(3)
      expect(level.artCorridor?.length, id).toBe(3)
      expect(level.artCorridor?.map((p) => p.spine), id).toEqual([
        'snakeSmall',
        'snakeMedium',
        'snakeLarge',
      ])
    }
  })

  it('R4: arrange is absent on snake1 and present on snake2..4; demo is present on snake1 only', () => {
    expect(getLevel('snake1').arrange).toBeUndefined()
    expect(getLevel('snake1').demo).toBe(true)
    for (const id of ['snake2', 'snake3', 'snake4'] as const) {
      const level = getLevel(id)
      expect(level.arrange, id).toBeDefined()
      expect(level.arrange?.from.length, id).toBe(3)
      expect(level.arrange?.snapRadius, id).toBeGreaterThan(0)
      expect(level.demo, id).toBeUndefined()
    }
  })

  it('resetOnContact stays false on all four (a snake is carried, not a wall)', () => {
    for (const id of SNAKE_IDS) expect(getLevel(id).resetOnContact, id).toBe(false)
  })

  it('enforceOrder is true on all four (design.md §0 A3)', () => {
    for (const id of SNAKE_IDS) expect(getLevel(id).rules.enforceOrder, id).toBe(true)
  })

  it('every corridor width sits at or below the tolerance clamp floor (56)', () => {
    for (const id of SNAKE_IDS) expect(getLevel(id).corridorWidth, id).toBeLessThanOrEqual(56)
  })

  describe('C1-C6 over the authored literals', () => {
    for (const id of SNAKE_IDS) {
      it(`${id}: C1 — corridorWidth + 2·residual ≤ thickness for the narrowest piece`, () => {
        const level = getLevel(id)
        const pieces = level.artCorridor!
        let minMargin = Infinity
        for (const piece of pieces) {
          const spine = DRAWN_SPINE[piece.spine]
          const height = (piece.span * piece.art.h) / piece.art.w
          const thicknessVb = spine.thickness * height
          const residualVb = (spine.residual * piece.span) / piece.art.w
          const margin = thicknessVb - level.corridorWidth - 2 * residualVb
          if (margin < minMargin) minMargin = margin
        }
        expect(minMargin, `${id}: C1 margin`).toBeGreaterThan(0)
      })

      it(`${id}: C2 — every piece's wave-crest radius clears corridorWidth/2 - BAND_INSET`, () => {
        const level = getLevel(id)
        const pieces = level.artCorridor!
        const required = level.corridorWidth / 2 - BAND_INSET_C2
        for (const piece of pieces) {
          const spine = DRAWN_SPINE[piece.spine]
          const height = (piece.span * piece.art.h) / piece.art.w
          for (const [widthFrac, riseFrac] of spine.halves) {
            const halfWidth = widthFrac * piece.span
            const amplitude = Math.abs(riseFrac) * height
            expect(waveCrestRadius(halfWidth, amplitude), `${id}/${piece.spine}`).toBeGreaterThan(
              required,
            )
          }
        }
      })

      it(`${id}: C3/C4 — minimum centreline separation clears 2·corridorWidth and 2·60`, () => {
        const target = buildLevelTarget(getLevel(id))
        const polylines = target.routes.map((r) => r.polyline)
        let minSep = Infinity
        for (let i = 0; i < polylines.length; i++) {
          for (let j = i + 1; j < polylines.length; j++) {
            const sep = minPairDistance(polylines[i], polylines[j])
            if (sep < minSep) minSep = sep
          }
        }
        expect(minSep, `${id}: C3`).toBeGreaterThan(2 * target.corridorWidth)
        expect(minSep, `${id}: C4`).toBeGreaterThan(2 * 60)
      })

      it(`${id}: C5 — the traceable span insets at least half the body thickness on both ends`, () => {
        const level = getLevel(id)
        for (const piece of level.artCorridor!) {
          const spine = DRAWN_SPINE[piece.spine]
          expect(spine.traceFrom, `${id}/${piece.spine} traceFrom`).toBeGreaterThanOrEqual(
            spine.thickness / (2 * piece.art.w),
          )
          expect(spine.traceTo, `${id}/${piece.spine} traceTo`).toBeLessThanOrEqual(1)
          expect(spine.traceTo, `${id}/${piece.spine} traceTo > traceFrom`).toBeGreaterThan(
            spine.traceFrom,
          )
        }
      })

      it(`${id}: C6 — every image box stays inside [0, 600] and clears the phase-1 span guards`, () => {
        const target = buildLevelTarget(getLevel(id))
        for (const placement of target.artCorridor ?? []) {
          expect(placement.box.y, id).toBeGreaterThanOrEqual(0)
          expect(placement.box.y + placement.box.height, id).toBeLessThanOrEqual(600)
        }
      })
    }
  })

  describe('R6: the coincidence — the fitted centreline matches the scored path within 0.5 units', () => {
    const SPINE_PROBES = 33
    for (const id of SNAKE_IDS) {
      it(`${id}: every probe lies within 0.5 viewBox units, and |tx| < 0.5`, () => {
        const level = getLevel(id)
        const target = buildLevelTarget(level)
        const placements = target.artCorridor!
        expect(placements.length).toBe(3)
        for (let i = 0; i < placements.length; i++) {
          const generated = flattenPathD(target.paths[i]).points
          const derived = flattenPathD(placements[i].d).points
          let worst = 0
          for (let p = 0; p < SPINE_PROBES; p++) {
            const f = p / (SPINE_PROBES - 1)
            const a = generated[Math.round(f * (generated.length - 1))]
            const b = derived[Math.round(f * (derived.length - 1))]
            const dist = Math.hypot(a.x - b.x, a.y - b.y)
            if (dist > worst) worst = dist
          }
          expect(worst, `${id} piece ${i}`).toBeLessThan(0.5)
        }
        // |tx| < 0.5: `box0.x = at.x - span/2` is the UN-translated box (what
        // `placeArtCorridor` computes before `layOutPaths`'s own centring
        // shift); `placements[i].box.x` is the SAME box AFTER that shift.
        // Their difference IS `tx`, and it must be tiny — the authored
        // coordinates are already the shipped ones.
        const configPieces = level.artCorridor!
        for (let i = 0; i < placements.length; i++) {
          const box0X = configPieces[i].at.x - configPieces[i].span / 2
          const tx = placements[i].box.x - box0X
          expect(Math.abs(tx), `${id} piece ${i}: |tx|`).toBeLessThan(0.5)
        }
      })
    }
  })

  it('R7: arc length is non-decreasing within the horizontal group (snake1 <= snake2 <= snake4); snake3 is not compared', () => {
    const arcOf = (id: string): number =>
      buildLevelTarget(getLevel(id)).routes.reduce((sum, r) => sum + r.length, 0)
    const snake1Arc = arcOf('snake1')
    const snake2Arc = arcOf('snake2')
    const snake4Arc = arcOf('snake4')
    expect(snake2Arc).toBeGreaterThanOrEqual(snake1Arc)
    expect(snake4Arc).toBeGreaterThanOrEqual(snake2Arc)
    // snake3 is the vertical outlier and is asserted nowhere against the
    // other three's arc length (design.md §0 A7).
  })
})
