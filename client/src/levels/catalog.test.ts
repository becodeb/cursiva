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
import { BAND_INSET, MIN_CORRIDOR, MIN_VIEWBOX_WIDTH, buildLevelTarget } from './buildLevel'
import { routeExtrema, vertexArtPoints } from './dolphinExtrema'
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
import { SECTORS } from '../zoo/sectors'
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
import { HEDGEHOG_SILHOUETTE } from '../detective/assets'
import { spineAnchors } from './spines'
import { TolTouch as TOL_TOUCH } from '../canvas/validation/constants'

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
  'bee1',
  'bee2',
  'bee3',
  'bee4',
  'dolphin1',
  'dolphin2',
  'dolphin3',
  'dolphin4',
  'hedgehog1',
  'hedgehog2',
  'hedgehog3',
  'hedgehog4',
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
    'snake1': 38,
    'snake2': 34,
    'snake3': 30,
    'snake4': 28,
    // The bee family draws no corridor at all — same convention as the
    // twelve reveal-grid levels above (design.md §6.1).
    'bee1': 0,
    'bee2': 0,
    'bee3': 0,
    'bee4': 0,
    'dolphin1': 110,
    'dolphin2': 100,
    'dolphin3': 96,
    'dolphin4': 84,
    // The hedgehog family draws no corridor at all — the reveal-grid/bee
    // convention: a routeless, per-stroke mechanic has nothing to be inside
    // of (design.md §8).
    'hedgehog1': 0,
    'hedgehog2': 0,
    'hedgehog3': 0,
    'hedgehog4': 0,
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
    // The bee family carries no fluency bar either — the same routeless
    // convention every reveal-grid level above uses.
    'bee1': 0,
    'bee2': 0,
    'bee3': 0,
    'bee4': 0,
    'dolphin1': 0,
    'dolphin2': 0,
    'dolphin3': 0,
    'dolphin4': 0,
    // No fluency bar either — same routeless convention.
    'hedgehog1': 0,
    'hedgehog2': 0,
    'hedgehog3': 0,
    'hedgehog4': 0,
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
      // The bee family also authors its own minAccuracy (100 — every flower
      // and the hive, `free-trail-waypoints` design.md §6.1), the same
      // per-family override precedent `reveal`/`artCorridor` set. Asserted
      // separately below ("LEVELS — the snake family" has its own sibling;
      // the bee family's own describe block covers R5).
      if (level.waypoints) continue
      // The hedgehog family also authors its own minAccuracy (70/80/90/100,
      // `radial-spines` design.md §8) — the same per-family override
      // precedent `reveal`/`artCorridor`/`waypoints` set.
      if (level.spines) continue
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

  it('has exactly one free level with no reveal grid and no waypoints, and the catalog opens with the entrance', () => {
    // Amended, not deleted (design.md §5.1, ratified amendment A1; extended
    // again by `free-trail-waypoints`): before the reveal grid, `kind:
    // 'free'` meant "the warm-up," and `f1-libre` was both the only free
    // level AND `LEVELS[0]`. Now seventeen levels are `kind: 'free'`
    // (level-engine spec "`kind: 'free'` Means 'No Route,' Not 'The
    // Warm-Up'"): `f1-libre`, still with neither `reveal` nor `waypoints`;
    // the twelve reveal-grid levels, each with a `reveal`; and the four bee
    // levels, each with `waypoints`. Now twenty-one (`radial-spines` design.md
    // §8 adds the four hedgehog levels, each with `spines`); the catalog's
    // first entry is `glass1`, the app's real opening.
    const free = LEVELS.filter((l) => l.kind === 'free')
    expect(free.filter((l) => !l.reveal && !l.waypoints && !l.spines).map((l) => l.id)).toEqual([
      'f1-libre',
    ])
    expect(free).toHaveLength(21)
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

  it('sounds and buzzes on every level with a corridor — and buzzes without one on the reveal grid and the bee family', () => {
    // A found gap in this guard, not called out by tasks.md's own reveal-grid
    // task list: the twelve reveal-grid levels are `kind: 'free'` (no
    // corridor) but deliberately keep `haptics: true` (design.md §5.2 — "a
    // tile clearing under the finger is a contact worth feeling"). Amended,
    // not deleted: `tone` still tracks having a corridor exactly as before;
    // `haptics` is now `hasCorridor OR reveal-bearing OR waypoint-bearing` —
    // the bee family has neither a corridor nor a `reveal` field, but a
    // flower opening or the hive being reached is its own contact worth
    // feeling (`free-trail-waypoints` design.md §2.3). The hedgehog family
    // joins the same list: a spine landing is a contact worth feeling too
    // (`radial-spines` design.md §2 D4, docs/13 §6).
    for (const level of LEVELS) {
      const hasCorridor = level.kind === 'path'
      expect(level.feedback.tone).toBe(hasCorridor)
      expect(level.feedback.haptics).toBe(
        hasCorridor || !!level.reveal || !!level.waypoints || !!level.spines,
      )
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

describe('LEVELS — the hedgehog family (radial-spines, design.md §8/§10/§11)', () => {
  const HEDGEHOG_IDS = ['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4'] as const

  it('clears its own baseRadius ceiling by the recorded margin, and never dips under TolTouch', () => {
    // Ceiling (design.md §2 D5, "computed from the real anchor chords"):
    // half the smallest chord between two REAL, adjacent generated anchors —
    // not the circle approximation `2·r_min·sinΔθ/2` would give, since the
    // profile's per-anchor radii vary along the arc. Margins recorded in
    // design.md §8: 3.5 / 2.9 / 1.1 / 1.5.
    const margins: Record<string, number> = {
      hedgehog1: 3.5,
      hedgehog2: 2.9,
      hedgehog3: 1.1,
      hedgehog4: 1.5,
    }
    for (const id of HEDGEHOG_IDS) {
      const cfg = getLevel(id).spines!
      const anchors = spineAnchors(cfg)
      let minChord = Infinity
      for (let i = 1; i < anchors.length; i++) {
        const d = Math.hypot(anchors[i].x - anchors[i - 1].x, anchors[i].y - anchors[i - 1].y)
        if (d < minChord) minChord = d
      }
      const ceiling = minChord / 2
      expect(cfg.rules.baseRadius, id).toBeLessThanOrEqual(ceiling)
      // Design.md §8's own ceilings are rounded to one decimal; the real
      // geometry's own margin is asserted to the nearest half-unit of that
      // rounding, not to floating-point precision.
      expect(ceiling - cfg.rules.baseRadius, id).toBeCloseTo(margins[id], 0)
      expect(cfg.rules.baseRadius, id).toBeGreaterThanOrEqual(TOL_TOUCH)
    }
  })

  it('lands no anchor on a foot or a belly — every profile anchor sits in [200, 380], the same arc on all three', () => {
    for (const id of ['hedgehog1', 'hedgehog2', 'hedgehog3'] as const) {
      const cfg = getLevel(id).spines!
      expect(cfg.arc, id).toEqual({ from: 200, to: 380 })
      const anchors = spineAnchors(cfg)
      for (const a of anchors) {
        expect(a.deg, `${id} anchor at ${a.deg}`).toBeGreaterThanOrEqual(200)
        expect(a.deg, `${id} anchor at ${a.deg}`).toBeLessThanOrEqual(380)
      }
    }
  })

  it('confirms the curled pose really is round — max/min − 1 ≤ 0.041 over its own spine arc', () => {
    const cfg = getLevel('hedgehog4').spines!
    const { radii } = HEDGEHOG_SILHOUETTE.curled
    const step = 360 / radii.length
    const inArc = (deg: number): boolean => {
      const d = ((deg % 360) + 360) % 360
      const from = ((cfg.arc.from % 360) + 360) % 360
      // hedgehog4's arc (65 → 365) wraps the whole circle, so every measured
      // ray is inside it — this is the admissibility check §11 asks for.
      return cfg.arc.to - cfg.arc.from >= 360 || d >= from
    }
    const spanRadii = radii.filter((_, i) => inArc(i * step))
    const max = Math.max(...spanRadii)
    const min = Math.min(...spanRadii)
    expect(max / min - 1).toBeLessThanOrEqual(0.041)
  })

  it('confirms the profile table is not an ellipse — the measured radius at 90° is ≥20% below 0.5·H', () => {
    const { radii } = HEDGEHOG_SILHOUETTE.profile
    const step = 360 / radii.length
    const idx90 = Math.round(90 / step) % radii.length
    const r90 = radii[idx90]
    // radii are normalised by WIDTH (r/W); an ellipse fit at 90° would read
    // close to 0.5·H/W. Any of the profile's own measured aspect keeps this
    // well under 0.8 · (0.5), so this assertion is sensitive by construction.
    expect(r90).toBeLessThan(0.5 * 0.8)
  })

  it('checks the ladder rather than adjectives: every tolerance parameter moves the same way, every level', () => {
    const cfgs = HEDGEHOG_IDS.map((id) => getLevel(id).spines!)
    for (let i = 1; i < cfgs.length; i++) {
      expect(cfgs[i].rules.baseRadius, HEDGEHOG_IDS[i]).toBeLessThanOrEqual(cfgs[i - 1].rules.baseRadius)
      expect(cfgs[i].rules.tolDeg, HEDGEHOG_IDS[i]).toBeLessThan(cfgs[i - 1].rules.tolDeg)
      expect(cfgs[i].rules.straightness, HEDGEHOG_IDS[i]).toBeGreaterThan(cfgs[i - 1].rules.straightness)
      expect(cfgs[i].count, HEDGEHOG_IDS[i]).toBeGreaterThan(cfgs[i - 1].count)
      expect(cfgs[i].rules.baseRadius, HEDGEHOG_IDS[i]).toBeGreaterThanOrEqual(TOL_TOUCH)
    }
    // Length bands strictly decrease from hedgehog2 to hedgehog4 (level-engine
    // spec, "Length bands strictly decrease from hedgehog2 to hedgehog4").
    for (let i = 2; i < cfgs.length; i++) {
      expect(cfgs[i].rules.lenMin, HEDGEHOG_IDS[i]).toBeLessThan(cfgs[i - 1].rules.lenMin)
      expect(cfgs[i].rules.lenMax, HEDGEHOG_IDS[i]).toBeLessThan(cfgs[i - 1].rules.lenMax)
    }
    expect(HEDGEHOG_IDS.map((id) => getLevel(id).rules.minAccuracy)).toEqual([70, 80, 90, 100])
    for (const id of HEDGEHOG_IDS) {
      expect(getLevel(id).rules.mustBeContinuous, id).toBe(false)
      expect(getLevel(id).rules.minFluency, id).toBe(0)
    }
  })

  it('clears the phase-1 amplitude guard on hedgehog1 by assertion, on the REAL measured radii', () => {
    // The guard's own code path (`kind !== 'path'`) exempts every free level,
    // hedgehog1 included; this asserts the guard's SPIRIT anyway, the way the
    // bee family did, over the real anchor geometry rather than the retired
    // ellipse estimate (design.md §8.1).
    const cfg = getLevel('hedgehog1').spines!
    const anchors = spineAnchors(cfg)
    const { lenMin } = cfg.rules
    const tipsAtLenMin = anchors.map((a) => ({ x: a.x + a.nx * lenMin, y: a.y + a.ny * lenMin }))
    const minY = Math.min(...tipsAtLenMin.map((p) => p.y))
    const maxY = Math.max(...tipsAtLenMin.map((p) => p.y))
    const minX = Math.min(...tipsAtLenMin.map((p) => p.x))
    const maxX = Math.max(...tipsAtLenMin.map((p) => p.x))
    expect(maxY - minY).toBeGreaterThan(300)
    expect(minY).toBeLessThan(180)
    expect(maxY).toBeGreaterThan(420)
    expect(maxX - minX).toBeGreaterThan(600)
  })

  it('never asks hedgehog2-4 for a stroke it would then refuse — the longest admissible spine stays on the paper', () => {
    for (const id of HEDGEHOG_IDS) {
      const cfg = getLevel(id).spines!
      const anchors = spineAnchors(cfg)
      const { lenMax } = cfg.rules
      for (const a of anchors) {
        const tip = { x: a.x + a.nx * lenMax, y: a.y + a.ny * lenMax }
        expect(tip.x, id).toBeGreaterThanOrEqual(0)
        expect(tip.x, id).toBeLessThanOrEqual(1000)
        expect(tip.y, id).toBeGreaterThanOrEqual(0)
        expect(tip.y, id).toBeLessThanOrEqual(600)
      }
    }
  })

  it('places hedgehog4 alone on the curled pose, the other three on the profile pose', () => {
    expect(getLevel('hedgehog1').spines!.pose).toBe('profile')
    expect(getLevel('hedgehog2').spines!.pose).toBe('profile')
    expect(getLevel('hedgehog3').spines!.pose).toBe('profile')
    expect(getLevel('hedgehog4').spines!.pose).toBe('curled')
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
      'bee1',
      'bee2',
      'bee3',
      'bee4',
      'dolphin1',
      'dolphin2',
      'dolphin3',
      'dolphin4',
      'hedgehog1',
      'hedgehog2',
      'hedgehog3',
      'hedgehog4',
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
      'bee1',
      'bee2',
      'bee3',
      'bee4',
      'dolphin1',
      'dolphin2',
      'dolphin3',
      'dolphin4',
      'hedgehog1',
      'hedgehog2',
      'hedgehog3',
      'hedgehog4',
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
      it(`${id}: C1 — corridorWidth + 2·residual ≤ thickness for the narrowest piece (against the EFFECTIVE, engine-clamped width)`, () => {
        const level = getLevel(id)
        const pieces = level.artCorridor!
        // `buildLevelTarget` clamps to `[MIN_CORRIDOR, MAX_CORRIDOR]` at
        // runtime regardless of the authored literal (`snake4`'s own 28 is
        // authored BELOW the floor on purpose, so R1's ordering still holds
        // once `snake3` itself sits exactly at the floor) — C1 must clear
        // against the width the child ACTUALLY plays, not the pre-clamp
        // literal.
        const effectiveWidth = Math.max(MIN_CORRIDOR, level.corridorWidth)
        let minMargin = Infinity
        for (const piece of pieces) {
          const spine = DRAWN_SPINE[piece.spine]
          const height = (piece.span * piece.art.h) / piece.art.w
          const thicknessVb = spine.thickness * height
          const residualVb = (spine.residual * piece.span) / piece.art.w
          const margin = thicknessVb - effectiveWidth - 2 * residualVb
          if (margin < minMargin) minMargin = margin
        }
        expect(minMargin, `${id}: C1 margin`).toBeGreaterThan(0)
      })

      it(`${id}: C2 — every piece's wave-crest radius clears corridorWidth/2 - BAND_INSET`, () => {
        const level = getLevel(id)
        const pieces = level.artCorridor!
        const required = Math.max(MIN_CORRIDOR, level.corridorWidth) / 2 - BAND_INSET_C2
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

  it('every arrange.from scatter point sits fully inside the SHIPPED sheet, on BOTH axes (regression: a screenshot caught the scatter points clipped twice — first off the bottom edge, then off the right edge, because the first fix only checked Y)', () => {
    for (const id of ['snake2', 'snake3', 'snake4'] as const) {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      const pieces = level.artCorridor!
      const scatter = level.arrange!.from
      expect(scatter.length).toBe(3)
      for (let i = 0; i < scatter.length; i++) {
        const piece = pieces[i]
        // A scattered (not yet placed) piece always renders UNROTATED
        // (`levels/arrange.ts`'s `arrangeRenderPieces`), so its on-screen
        // box uses `span` as its WIDTH regardless of `piece.rotate` — the
        // exact axis the first correction's test never checked.
        const width = piece.span
        const height = (piece.span * piece.art.h) / piece.art.w
        const left = scatter[i].x - width / 2
        const right = scatter[i].x + width / 2
        const top = scatter[i].y - height / 2
        const bottom = scatter[i].y + height / 2
        expect(left, `${id} piece ${i} left`).toBeGreaterThanOrEqual(0)
        expect(right, `${id} piece ${i} right`).toBeLessThanOrEqual(target.viewBoxWidth)
        expect(top, `${id} piece ${i} top`).toBeGreaterThanOrEqual(0)
        expect(bottom, `${id} piece ${i} bottom`).toBeLessThanOrEqual(600)
      }
    }
  })

  it("snake1/snake2's horizontal boxes sit as close to fondo arena.png's own quiet sand band as C3/C4 allows — the SMALL snake fully inside it, the LARGE one's remaining rock overlap bounded and disclosed, not silently regressed (docs/13 §4 decision 3, design.md §3.6)", () => {
    // The quiet band was measured directly off the source PNG (rows 204-819
    // are luma 204.4 with zero row-to-row variance — the uniform sand; the
    // rock/palm bands on either side are not) and mapped through
    // `xMidYMid slice`'s own crop (`zoo/backdrops.ts`'s
    // `corridorRows: {top: 51, bottom: 973}` for the `snake` row, source
    // px → viewBox: `(row - 51) * (1000/1536)`). Hand-copied the same way
    // `DRAWN_SPINE` is: a literal guarded by a regression test, not
    // recomputed from the PNG at runtime.
    //
    // Full containment for every piece is NOT achievable here: the quiet
    // band is 400.39 units tall, the three boxes' own heights sum to
    // 398.86 (1.53 units of slack), but C3/C4 (below, in this same
    // describe block) independently requires bigger gaps than that slack
    // allows. This test locks in the (C3/C4-compatible) placement design.md
    // §3.6 chose instead: the small snake fully inside the band, the large
    // one's overlap reduced (from ~99 to at most 80 units, still a real,
    // disclosed sliver) rather than eliminated.
    const QUIET_TOP = 99.48
    const QUIET_BOTTOM = 499.87
    for (const id of ['snake1', 'snake2'] as const) {
      const level = getLevel(id)
      const [small, , large] = level.artCorridor!
      const smallHeight = (small.span * small.art.h) / small.art.w
      const smallTop = small.at.y - DRAWN_SPINE[small.spine].mid * smallHeight
      expect(smallTop, `${id} small top`).toBeGreaterThanOrEqual(QUIET_TOP)
      expect(smallTop + smallHeight, `${id} small bottom`).toBeLessThanOrEqual(QUIET_BOTTOM)

      const largeHeight = (large.span * large.art.h) / large.art.w
      const largeBottom = large.at.y - DRAWN_SPINE[large.spine].mid * largeHeight + largeHeight
      expect(largeBottom - QUIET_BOTTOM, `${id} large overlap past quiet bottom`).toBeLessThanOrEqual(80)
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

// ─────────────────────────────────────────────────────────────────────────────
// The bee family (`free-trail-waypoints`, design.md §4.2/§6.2). C1-C6 and
// R1-R5, asserted directly over the authored literals — R7 (registry
// cross-checks against `ADVENTURES.bee`/`bosque.adventureIds`) lives in
// `zoo/adventures.test.ts`/`zoo/sectors.test.ts` once those rows exist
// (Phase 7); R6 (the rendered-markup coincidence) lives in
// `canvas/WaypointLayer.test.tsx`, re-pointed at this real catalog.
// ─────────────────────────────────────────────────────────────────────────────
describe('the bee family — C1-C6 and R1-R5 (design.md §4.2/§6.2)', () => {
  const BEE_IDS = ['bee1', 'bee2', 'bee3', 'bee4'] as const

  function polylineLength(points: ReadonlyArray<{ x: number; y: number }>): number {
    let sum = 0
    for (let i = 1; i < points.length; i++) {
      sum += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    }
    return sum
  }

  /** `start → stops (authored order) → goal`: the minimum route length a
   *  child must travel, since the route itself is invented. */
  function minimumRoute(id: string): ReadonlyArray<{ x: number; y: number }> {
    const w = getLevel(id).waypoints!
    return [w.start, ...w.stops, w.goal]
  }

  /** The art box a waypoint renders at — `placeArt`'s own DEFAULT_GRIP
   *  (centred), the same grip `WaypointLayer` uses since neither the flower
   *  nor the honeycomb art declares one. */
  function artBox(
    point: { x: number; y: number },
    size: number,
    art: { w: number; h: number },
  ): { minX: number; maxX: number; minY: number; maxY: number } {
    const width = (size * art.w) / art.h
    return {
      minX: point.x - width / 2,
      maxX: point.x + width / 2,
      minY: point.y - size / 2,
      maxY: point.y + size / 2,
    }
  }

  it('R1: stop radius strictly decreases (110 → 84 → 62 → 38)', () => {
    const radii = BEE_IDS.map((id) => getLevel(id).waypoints!.stops[0].radius)
    expect(radii).toEqual([110, 84, 62, 38])
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeLessThan(radii[i - 1])
  })

  it('R2: goal radius strictly decreases (96 → 88 → 80 → 72)', () => {
    const radii = BEE_IDS.map((id) => getLevel(id).waypoints!.goal.radius)
    expect(radii).toEqual([96, 88, 80, 72])
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeLessThan(radii[i - 1])
  })

  it('R3: stop counts are 1, 3, 3, 3 — bee1 carries exactly one flower (the author\'s resolved decision)', () => {
    expect(BEE_IDS.map((id) => getLevel(id).waypoints!.stops.length)).toEqual([1, 3, 3, 3])
  })

  it('R5: minAccuracy 100, demo absent, carrier true with its own carrierArt, on all four', () => {
    for (const id of BEE_IDS) {
      const level = getLevel(id)
      expect(level.rules.minAccuracy, id).toBe(100)
      expect(level.demo, id).toBeUndefined()
      expect(level.carrier, id).toBe(true)
      expect(level.carrierArt?.art.href, id).toBe(SECTOR_ADVENTURE_ART.bee.href)
    }
  })

  it('C1: every waypoint art box lies inside y ∈ [100, 499] and at least 20 units inside x ∈ [0, 1000]', () => {
    for (const id of BEE_IDS) {
      const w = getLevel(id).waypoints!
      for (const stop of w.stops) {
        const box = artBox(stop, w.stopSize, SECTOR_ADVENTURE_ART.flower)
        expect(box.minY, `${id} stop`).toBeGreaterThanOrEqual(100)
        expect(box.maxY, `${id} stop`).toBeLessThanOrEqual(499)
        expect(box.minX, `${id} stop`).toBeGreaterThanOrEqual(20)
        expect(box.maxX, `${id} stop`).toBeLessThanOrEqual(980)
      }
      const goalBox = artBox(w.goal, w.goalSize, SECTOR_ADVENTURE_ART.honeycomb)
      expect(goalBox.minY, `${id} goal`).toBeGreaterThanOrEqual(100)
      expect(goalBox.maxY, `${id} goal`).toBeLessThanOrEqual(499)
      expect(goalBox.minX, `${id} goal`).toBeGreaterThanOrEqual(20)
      expect(goalBox.maxX, `${id} goal`).toBeLessThanOrEqual(980)
    }
  })

  it('C2: every stop and goal radius is at least half the rendered picture\'s larger dimension — the target is never smaller than the art', () => {
    for (const id of BEE_IDS) {
      const w = getLevel(id).waypoints!
      for (const stop of w.stops) {
        const artW = (w.stopSize * SECTOR_ADVENTURE_ART.flower.w) / SECTOR_ADVENTURE_ART.flower.h
        expect(stop.radius, id).toBeGreaterThanOrEqual(Math.max(artW, w.stopSize) / 2)
      }
      const artW = (w.goalSize * SECTOR_ADVENTURE_ART.honeycomb.w) / SECTOR_ADVENTURE_ART.honeycomb.h
      expect(w.goal.radius, id).toBeGreaterThanOrEqual(Math.max(artW, w.goalSize) / 2)
    }
  })

  it('C3: the carrier\'s own box at start lies fully inside the sheet (no clampArtBox on the carrier group)', () => {
    const BEE_SIZE = 76
    for (const id of BEE_IDS) {
      const start = getLevel(id).waypoints!.start
      const width = (BEE_SIZE * SECTOR_ADVENTURE_ART.bee.w) / SECTOR_ADVENTURE_ART.bee.h
      expect(start.x - width / 2, id).toBeGreaterThanOrEqual(0)
      expect(start.x + width / 2, id).toBeLessThanOrEqual(1000)
      expect(start.y - BEE_SIZE / 2, id).toBeGreaterThanOrEqual(0)
      expect(start.y + BEE_SIZE / 2, id).toBeLessThanOrEqual(600)
    }
  })

  it('C4: bee3/bee4 use the whole arm — span > 300 vertically, minY < 180, maxY > 420, span > 600 horizontally', () => {
    for (const id of ['bee3', 'bee4']) {
      const points = minimumRoute(id)
      const xs = points.map((p) => p.x)
      const ys = points.map((p) => p.y)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      expect(maxY - minY, id).toBeGreaterThan(300)
      expect(minY, id).toBeLessThan(180)
      expect(maxY, id).toBeGreaterThan(420)
      expect(Math.max(...xs) - Math.min(...xs), id).toBeGreaterThan(600)
    }
  })

  it("C5: bee1/bee2's travel envelope is strictly smaller than bee3's on BOTH axes — 'corto' is a checked claim", () => {
    const envelope = (id: string) => {
      const points = minimumRoute(id)
      const xs = points.map((p) => p.x)
      const ys = points.map((p) => p.y)
      return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
    }
    const bee3 = envelope('bee3')
    for (const id of ['bee1', 'bee2']) {
      const e = envelope(id)
      expect(e.w, id).toBeLessThan(bee3.w)
      expect(e.h, id).toBeLessThan(bee3.h)
    }
  })

  it('C6: minimum-route length strictly increases bee1 < bee2 < bee3; bee4 is within ±5% of bee3', () => {
    const lengths = BEE_IDS.map((id) => polylineLength(minimumRoute(id)))
    expect(lengths[0]).toBeLessThan(lengths[1])
    expect(lengths[1]).toBeLessThan(lengths[2])
    const ratio = lengths[3] / lengths[2]
    expect(ratio).toBeGreaterThanOrEqual(0.95)
    expect(ratio).toBeLessThanOrEqual(1.05)
  })

  it('every bee level is phase 1, kind free, blank surface, no maze, no resetOnContact, showGuide false, enforceOrder false', () => {
    for (const id of BEE_IDS) {
      const level = getLevel(id)
      expect(level.phase, id).toBe(1)
      expect(level.kind, id).toBe('free')
      expect(level.surface, id).toBe('blank')
      expect(level.maze, id).toBe(false)
      expect(level.resetOnContact, id).toBe(false)
      expect(level.showGuide, id).toBe(false)
      expect(level.rules.enforceOrder, id).toBe(false)
      expect(level.feedback.tone, id).toBe(false)
      expect(level.feedback.haptics, id).toBe(true)
      expect(level.feedback.metronomeBpm, id).toBe(0)
      expect(level.feedback.rail, id).toBe(false)
      expect(level.corridorWidth, id).toBe(0)
      expect(level.rules.minFluency, id).toBe(0)
      expect(level.paths, id).toEqual([])
      expect(level.letters, id).toEqual([])
    }
  })

  it('R7: every bee id appears in ADVENTURES.bee.levelIds, bosque.adventureIds and EXPECTED_IDS, in the same order', () => {
    expect(ADVENTURES.find((a) => a.id === 'bee')!.levelIds).toEqual(BEE_IDS)
    const bosque = SECTORS.find((s) => s.id === 'bosque')!
    expect(bosque.adventureIds).toEqual(BEE_IDS)
    const positions = BEE_IDS.map((id) => EXPECTED_IDS.indexOf(id))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})

describe('the dolphin family — one rung per docs/13 §2 step, amplitude guard satisfied at full amplitude (design.md §4.2, §5.2)', () => {
  const DOLPHIN_IDS = ['dolphin1', 'dolphin2', 'dolphin3', 'dolphin4'] as const

  it('the ladder is monotone: period count rises (4<6<10<14), corridor width falls (110>100>96>84)', () => {
    const periods = DOLPHIN_IDS.map((id) => routeExtrema(buildLevelTarget(getLevel(id)).polyline).length)
    expect(periods).toEqual([4, 6, 10, 14])
    for (let i = 1; i < periods.length; i++) expect(periods[i]).toBeGreaterThan(periods[i - 1])

    const widths = DOLPHIN_IDS.map((id) => getLevel(id).corridorWidth)
    expect(widths).toEqual([110, 100, 96, 84])
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThan(widths[i - 1])
  })

  it('clears the phase-1 amplitude guard at full amplitude (A=160>150) on all four', () => {
    for (const id of DOLPHIN_IDS) {
      const { paths } = getLevel(id)
      let minY = Infinity
      let maxY = -Infinity
      for (const d of paths) {
        for (const p of flattenPathD(d).points) {
          if (p.y < minY) minY = p.y
          if (p.y > maxY) maxY = p.y
        }
      }
      expect(maxY - minY, id).toBeGreaterThan(300)
      expect(minY, id).toBeLessThan(180)
      expect(maxY, id).toBeGreaterThan(420)
      // The amplitude itself clears the guard's own derived threshold (design
      // §4.2: for a sine centred at y=300, minY<180/maxY>420 reduce to A>150).
      expect(300 - minY, id).toBeGreaterThan(150)
    }
  })

  it('a camera is present ONLY on dolphin3/dolphin4, with viewWidth === MIN_VIEWBOX_WIDTH', () => {
    expect(getLevel('dolphin1').camera).toBeUndefined()
    expect(getLevel('dolphin2').camera).toBeUndefined()
    expect(getLevel('dolphin3').camera?.viewWidth).toBe(MIN_VIEWBOX_WIDTH)
    expect(getLevel('dolphin4').camera?.viewWidth).toBe(MIN_VIEWBOX_WIDTH)
  })

  it('demo is true ONLY on dolphin1; resetOnContact is false and no clue is authored on all four', () => {
    expect(getLevel('dolphin1').demo).toBe(true)
    for (const id of ['dolphin2', 'dolphin3', 'dolphin4']) expect(getLevel(id).demo, id).not.toBe(true)
    for (const id of DOLPHIN_IDS) {
      expect(getLevel(id).resetOnContact, id).toBe(false)
      expect(getLevel(id).clue, id).toBeUndefined()
      expect(getLevel(id).obstacles, id).toBeUndefined()
    }
  })

  it('the crest/trough box table (design.md §5.2, derived from vertexArtPoints)', () => {
    const BOXES: Record<string, { crest: [number, number]; trough: [number, number] }> = {
      dolphin1: { crest: [13, 77], trough: [523, 587] },
      dolphin2: { crest: [18, 82], trough: [518, 582] },
      dolphin3: { crest: [20, 84], trough: [516, 580] },
      dolphin4: { crest: [26, 90], trough: [510, 574] },
    }
    for (const id of DOLPHIN_IDS) {
      const level = getLevel(id)
      const extrema = routeExtrema(buildLevelTarget(level).polyline)
      const at = vertexArtPoints(extrema, {
        corridorWidth: level.corridorWidth,
        size: level.vertexArt!.size,
        clear: level.vertexArt!.clear ?? 8,
      })
      const crestBottom = at.find((_, i) => extrema[i].side === 'crest')!.y
      const troughBottom = at.find((_, i) => extrema[i].side === 'trough')!.y
      const [crestTop, crestExpectedBottom] = BOXES[id].crest
      const [troughTop, troughExpectedBottom] = BOXES[id].trough
      expect(crestBottom, `${id} crest bottom`).toBeCloseTo(crestExpectedBottom, 0)
      expect(crestBottom - level.vertexArt!.size, `${id} crest top`).toBeCloseTo(crestTop, 0)
      expect(troughBottom, `${id} trough bottom`).toBeCloseTo(troughExpectedBottom, 0)
      expect(troughBottom - level.vertexArt!.size, `${id} trough top`).toBeCloseTo(troughTop, 0)
    }
  })

  it('every dolphin uses vertexArt.place "extrema" with the shipped dolphin art, size 64, clear 8', () => {
    for (const id of DOLPHIN_IDS) {
      const va = getLevel(id).vertexArt
      expect(va, id).toBeDefined()
      expect(va?.place, id).toBe('extrema')
      expect(va?.size, id).toBe(64)
      expect(va?.clear, id).toBe(8)
      expect(va?.art, id).toBe(SECTOR_ADVENTURE_ART.dolphin)
    }
  })
})
