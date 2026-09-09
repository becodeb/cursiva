// Catalog contract (docs/08 section 5). The catalog is data, so these tests
// guard the DATA: ids, phases, rules and the promise that every authored path
// is something the engine can actually build a target from.
import { describe, expect, it } from 'vitest'
import { flattenPathD } from '../letters/svgLetter'
import { buildLevelTarget } from './buildLevel'
import { DEGRADED_LEVEL_IDS, LEVELS, PHASE_TITLES, getLevel, levelsByPhase, nextLevelId } from './catalog'
import type { Phase } from './types'

// docs/08 section 5 tables: 1 libre + 6 senderos + 4 patrones + 4 grafemas +
// 2 enlaces + 2 palabras.
const EXPECTED_IDS = [
  'f1-libre',
  'f1-travesia',
  'f1-pelotas',
  'f1-paseo',
  'f1-pasillo',
  'f1-ondas',
  'f1-espiral',
  'f2-guirnalda',
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
    'f1-travesia': 120,
    'f1-pelotas': 84,
    'f1-paseo': 68,
    'f1-pasillo': 56,
    'f1-ondas': 95,
    'f1-espiral': 70,
    'f2-guirnalda': 85,
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
    'f1-travesia': 0,
    'f1-pelotas': 0,
    'f1-paseo': 0,
    'f1-pasillo': 0,
    'f1-ondas': 0,
    'f1-espiral': 0,
    'f2-guirnalda': 35,
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

  it('makes phase 2 onward continuous, and phase 1 free except the spiral', () => {
    for (const level of LEVELS) {
      if (level.phase >= 2) expect(level.rules.mustBeContinuous).toBe(true)
    }
    expect(getLevel('f1-libre').rules.mustBeContinuous).toBe(false)
    expect(getLevel('f1-travesia').rules.mustBeContinuous).toBe(false)
    expect(getLevel('f1-ondas').rules.mustBeContinuous).toBe(false)
    // A timing level REQUIRES stopping, and a child who waits may well rest the
    // finger: demanding one unbroken stroke would punish the strategy the level
    // exists to teach.
    expect(getLevel('f1-pelotas').rules.mustBeContinuous).toBe(false)
    expect(getLevel('f1-paseo').rules.mustBeContinuous).toBe(false)
    expect(getLevel('f1-pasillo').rules.mustBeContinuous).toBe(false)
    expect(getLevel('f1-espiral').rules.mustBeContinuous).toBe(true)
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

  it('metronomes phase 2 and only phase 2, between 50 and 70 bpm', () => {
    for (const level of LEVELS) {
      if (level.phase !== 2) {
        expect(level.feedback.metronomeBpm).toBe(0)
        continue
      }
      expect(level.feedback.metronomeBpm).toBeGreaterThanOrEqual(50)
      expect(level.feedback.metronomeBpm).toBeLessThanOrEqual(70)
    }
  })

  it('slows the beat down as the pattern cycle gets longer', () => {
    // One beat = one cycle: the three-cycle patterns cover more ground per
    // beat than the four-cycle ones, so they must be slower.
    const bpm = (id: string): number => getLevel(id).feedback.metronomeBpm
    expect(bpm('f2-guirnalda')).toBeGreaterThan(bpm('f2-crestas'))
    expect(bpm('f2-colinas')).toBeGreaterThan(bpm('f2-crestas'))
    expect(bpm('f2-crestas')).toBeGreaterThan(bpm('f2-bucles'))
  })

  it('turns the assisted rail on at FIRST CONTACT only', () => {
    // docs/03 section 6: the rail is the first-contact assist. Left on it stops
    // being an assist and becomes the child's motor plan.
    const railed = LEVELS.filter((l) => l.feedback.rail).map((l) => l.id)
    expect(railed).toEqual(['f1-travesia', 'f3-l'])
    expect(levelsByPhase(1).filter((l) => l.kind === 'path')[0].id).toBe('f1-travesia')
    expect(levelsByPhase(3)[0].id).toBe('f3-l')
  })

  it('sounds and buzzes on every level with a corridor, and on none without one', () => {
    for (const level of LEVELS) {
      const hasCorridor = level.kind === 'path'
      expect(level.feedback.tone).toBe(hasCorridor)
      expect(level.feedback.haptics).toBe(hasCorridor)
    }
  })

  it('narrows the first route and the long escort, and never in a direction that widens', () => {
    const tapered = LEVELS.filter((l) => l.taper)
    expect(tapered.map((l) => l.id)).toEqual(['f1-travesia', 'f1-pasillo'])
    for (const level of tapered) {
      expect(level.taper?.from).toBeGreaterThan(level.taper?.to ?? Infinity)
    }
  })
})

describe('LEVELS — hazards, reset and carrier', () => {
  it('resets the run only where a rule says the walls matter', () => {
    // `resetOnContact` is a RULE, not a punishment (types.ts): it belongs to the
    // timing level and to the two escort levels and nowhere else. Switching it
    // on for a warm-up route would turn the first minutes of the app into a
    // wall of restarts.
    const resetting = LEVELS.filter((l) => l.resetOnContact).map((l) => l.id)
    expect(resetting).toEqual(['f1-pelotas', 'f1-paseo', 'f1-pasillo'])
  })

  it('puts a character on the fingertip exactly on the escort levels', () => {
    const carrying = LEVELS.filter((l) => l.carrier).map((l) => l.id)
    expect(carrying).toEqual(['f1-paseo', 'f1-pasillo'])
    // Carrying someone is what MAKES the walls matter, so the two always travel
    // together: a carrier without the reset rule is decoration.
    for (const level of LEVELS) {
      if (level.carrier) expect(level.resetOnContact).toBe(true)
    }
  })

  it('gives the escort levels the narrowest corridors in phase 1', () => {
    // The whole point of an escort level is that the walls matter, so its
    // corridor has to be tighter than every route where they do not.
    const openRoutes = levelsByPhase(1).filter((l) => l.kind === 'path' && !l.carrier)
    const tightestOpenRoute = Math.min(...openRoutes.map((l) => l.corridorWidth))
    for (const level of levelsByPhase(1)) {
      if (!level.carrier) continue
      expect(
        level.corridorWidth,
        `${level.id} must be tighter than every non-escort phase-1 route`,
      ).toBeLessThan(tightestOpenRoute)
    }
    // Wide first, tight second: the rule arrives before the precision demand.
    expect(getLevel('f1-paseo').corridorWidth).toBeGreaterThan(
      getLevel('f1-pasillo').corridorWidth,
    )
  })

  it('puts hazards on exactly one level, and exactly two of them', () => {
    const hazardous = LEVELS.filter((l) => (l.obstacles?.length ?? 0) > 0)
    expect(hazardous.map((l) => l.id)).toEqual(['f1-pelotas'])
    expect(hazardous[0].obstacles).toHaveLength(2)
    // A hazard without the reset rule is an animation, not an obstacle.
    for (const level of LEVELS) {
      if ((level.obstacles?.length ?? 0) > 0) expect(level.resetOnContact).toBe(true)
    }
  })

  it('spaces the hazards along the route so there is room to stop between them', () => {
    const obstacles = getLevel('f1-pelotas').obstacles ?? []
    expect(obstacles.map((o) => o.at)).toEqual([0.33, 0.66])
    for (const o of obstacles) {
      expect(o.at).toBeGreaterThan(0.15)
      expect(o.at).toBeLessThan(0.85)
    }
    expect(obstacles[1].at - obstacles[0].at).toBeGreaterThan(0.25)
  })

  it('keeps the two hazards out of step — one rhythm would be one lesson', () => {
    const obstacles = getLevel('f1-pelotas').obstacles ?? []
    expect(Math.abs(obstacles[0].phase - obstacles[1].phase)).toBeGreaterThanOrEqual(0.25)
    // Different periods too: with equal periods a phase offset is a FIXED
    // relation the child can learn as a single pattern.
    expect(obstacles[0].periodMs).not.toBe(obstacles[1].periodMs)
  })

  it('runs the hazards slowly enough for a six-year-old to read and plan', () => {
    for (const o of getLevel('f1-pelotas').obstacles ?? []) {
      expect(o.periodMs).toBeGreaterThanOrEqual(2200)
      expect(o.periodMs).toBeLessThanOrEqual(2800)
      expect(o.radius).toBeGreaterThanOrEqual(26)
      expect(o.radius).toBeLessThanOrEqual(34)
    }
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
      'f1-travesia',
      'f1-pelotas',
      'f1-paseo',
      'f1-pasillo',
      'f1-ondas',
      'f1-espiral',
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
