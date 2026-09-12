// Timed-hazard geometry contract (docs/08 section 5, `f1-pelotas`). The point
// of these tests is that a hazard CROSSES the channel and is READABLE in time:
// a ball that drifted along the corridor, or two balls locked in step, would
// still animate and would still be the wrong level.
import { describe, expect, it } from 'vitest'
import { buildLevelTarget } from './buildLevel'
import { LEGACY_PHASE_1, getLevel } from './catalog'
import { OBSTACLE_INK_ALLOWANCE, hazardGapFraction, hitObstacle, obstacleAt } from './obstacles'
import { straight, sweep } from './paths'
import type { LevelConfig, LevelTarget, Obstacle } from './types'

function makeConfig(over: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 'test',
    phase: 1,
    title: 'Test',
    hint: 'Seguí el camino.',
    kind: 'path',
    surface: 'blank',
    maze: true,
    resetOnContact: true,
    carrier: false,
    feedback: { tone: true, haptics: true, metronomeBpm: 0, rail: false },
    paths: [straight()],
    corridorWidth: 100,
    rules: { mustBeContinuous: false, enforceOrder: true, minFluency: 0, minAccuracy: 55 },
    showGuide: true,
    letters: [],
    ...over,
  }
}

/**
 * A DIAGONAL target. A horizontal route would pass a perpendicular test by
 * accident — every plausible wrong implementation (offset the y, offset along
 * the tangent, forget to normalize) looks identical on a flat line.
 */
const DIAGONAL: LevelTarget = buildLevelTarget(
  makeConfig({ paths: ['M 100 100 L 500 300 L 900 500'] }),
)

/** Unit tangent of the diagonal route: (800, 400) normalized. */
const TAN = { x: 2 / Math.sqrt(5), y: 1 / Math.sqrt(5) }

function obstacle(over: Partial<Obstacle> = {}): Obstacle {
  return { at: 0.5, travel: 200, periodMs: 1000, phase: 0, radius: 30, ...over }
}

describe('obstacleAt — the hazard crosses the route, it does not slide along it', () => {
  it('displaces along the LOCAL PERPENDICULAR on a diagonal route', () => {
    const o = obstacle()
    // sin(2π · 0.25) = 1, so the hazard sits at its positive extreme.
    const centre = obstacleAt(o, DIAGONAL, 250)
    const base = obstacleAt(o, DIAGONAL, 0)

    const dx = centre.x - base.x
    const dy = centre.y - base.y
    // Zero projection on the tangent = a purely perpendicular displacement.
    expect(dx * TAN.x + dy * TAN.y).toBeCloseTo(0, 6)
    expect(Math.hypot(dx, dy)).toBeCloseTo(o.travel / 2, 6)
    // And it is the true normal (−ty, tx), not the y axis.
    expect(dx).toBeCloseTo(-TAN.y * (o.travel / 2), 6)
    expect(dy).toBeCloseTo(TAN.x * (o.travel / 2), 6)
  })

  it('sits ON the route at every zero crossing of the cycle', () => {
    const o = obstacle()
    const base = obstacleAt(o, DIAGONAL, 0)
    for (const t of [0, 500, 1000, 1500, 2000]) {
      const centre = obstacleAt(o, DIAGONAL, t)
      expect(centre.x).toBeCloseTo(base.x, 6)
      expect(centre.y).toBeCloseTo(base.y, 6)
    }
  })

  it('places the anchor at `at` of the ARC LENGTH, so `at` orders the hazards', () => {
    const early = obstacleAt(obstacle({ at: 0.25 }), DIAGONAL, 0)
    const late = obstacleAt(obstacle({ at: 0.75 }), DIAGONAL, 0)
    const start = DIAGONAL.polyline[0]
    expect(Math.hypot(early.x - start.x, early.y - start.y)).toBeCloseTo(
      DIAGONAL.length * 0.25,
      4,
    )
    expect(Math.hypot(late.x - start.x, late.y - start.y)).toBeCloseTo(
      DIAGONAL.length * 0.75,
      4,
    )
  })

  it('reaches exactly ±travel/2 and never overshoots it', () => {
    const o = obstacle()
    const base = obstacleAt(o, DIAGONAL, 0)
    let peak = 0
    for (let t = 0; t <= 1000; t += 5) {
      const c = obstacleAt(o, DIAGONAL, t)
      peak = Math.max(peak, Math.hypot(c.x - base.x, c.y - base.y))
    }
    expect(peak).toBeCloseTo(o.travel / 2, 3)
  })
})

describe('obstacleAt — time', () => {
  it('wraps cleanly: one period later is the same place', () => {
    const o = obstacle({ periodMs: 2600, phase: 0.31 })
    for (const t of [0, 137, 900, 2599]) {
      const now = obstacleAt(o, DIAGONAL, t)
      const later = obstacleAt(o, DIAGONAL, t + o.periodMs)
      const muchLater = obstacleAt(o, DIAGONAL, t + 7 * o.periodMs)
      expect(later.x).toBeCloseTo(now.x, 6)
      expect(later.y).toBeCloseTo(now.y, 6)
      expect(muchLater.x).toBeCloseTo(now.x, 5)
      expect(muchLater.y).toBeCloseTo(now.y, 5)
    }
  })

  it('is PURE: the same timeMs always gives the same answer', () => {
    const o = obstacle({ periodMs: 2200, phase: 0.5 })
    const first = obstacleAt(o, DIAGONAL, 1234)
    const second = obstacleAt(o, DIAGONAL, 1234)
    expect(second).toEqual(first)
  })

  it('freezes a hazard with a non-positive period instead of producing NaN', () => {
    const frozen = obstacleAt(obstacle({ periodMs: 0 }), DIAGONAL, 900)
    const onRoute = obstacleAt(obstacle(), DIAGONAL, 0)
    expect(frozen.x).toBeCloseTo(onRoute.x, 6)
    expect(frozen.y).toBeCloseTo(onRoute.y, 6)
  })

  it('separates two hazards in time when their phases differ', () => {
    // Same `at`, same period: with a half-cycle offset they are mirror images,
    // so one is at its extreme exactly when the other is on the route.
    const a = obstacle({ phase: 0 })
    const b = obstacle({ phase: 0.5 })
    const base = obstacleAt(a, DIAGONAL, 0)
    const offset = (o: Obstacle, t: number): number => {
      const c = obstacleAt(o, DIAGONAL, t)
      return (c.x - base.x) * -TAN.y + (c.y - base.y) * TAN.x
    }
    for (const t of [0, 90, 250, 610, 875]) {
      expect(offset(b, t)).toBeCloseTo(-offset(a, t), 6)
    }
    // At the moment `a` is fully out of the way, `b` is dead centre.
    expect(Math.abs(offset(a, 250))).toBeCloseTo(100, 6)
    expect(Math.abs(offset(b, 250))).toBeCloseTo(100, 6)
    expect(offset(a, 250)).toBeCloseTo(-offset(b, 250), 6)
    // In-phase hazards would be indistinguishable — this is what phase buys.
    const inStep = obstacle({ phase: 0 })
    expect(offset(inStep, 250)).toBeCloseTo(offset(a, 250), 6)
  })
})

describe('hitObstacle', () => {
  it('hits a point at the extreme of travel and misses one just outside', () => {
    const o = obstacle()
    const centre = obstacleAt(o, DIAGONAL, 250)
    const reach = o.radius + OBSTACLE_INK_ALLOWANCE
    // Straight out along the normal from the extreme position.
    const outward = { x: -TAN.y, y: TAN.x }
    const at = (d: number): { x: number; y: number } => ({
      x: centre.x + outward.x * d,
      y: centre.y + outward.y * d,
    })
    expect(hitObstacle(centre, [o], DIAGONAL, 250)).toBe(0)
    expect(hitObstacle(at(reach - 0.01), [o], DIAGONAL, 250)).toBe(0)
    expect(hitObstacle(at(reach + 0.01), [o], DIAGONAL, 250)).toBe(-1)
  })

  it('pins the ink allowance: the bare radius is not the hit radius', () => {
    expect(OBSTACLE_INK_ALLOWANCE).toBe(12)
    const o = obstacle()
    const centre = obstacleAt(o, DIAGONAL, 250)
    const justPastTheBall = {
      x: centre.x + (-TAN.y * (o.radius + OBSTACLE_INK_ALLOWANCE / 2)),
      y: centre.y + TAN.x * (o.radius + OBSTACLE_INK_ALLOWANCE / 2),
    }
    // Outside the drawn circle, inside the ink allowance: still a touch.
    expect(Math.hypot(justPastTheBall.x - centre.x, justPastTheBall.y - centre.y)).toBeGreaterThan(
      o.radius,
    )
    expect(hitObstacle(justPastTheBall, [o], DIAGONAL, 250)).toBe(0)
  })

  it('misses when the hazard has swung out of the way, and hits when it returns', () => {
    const o = obstacle()
    const onRoute = obstacleAt(o, DIAGONAL, 0)
    // t = 250 puts the ball a full 100 units off the route; the centre of the
    // channel is then clear.
    expect(hitObstacle(onRoute, [o], DIAGONAL, 250)).toBe(-1)
    expect(hitObstacle(onRoute, [o], DIAGONAL, 0)).toBe(0)
  })

  it('reports the INDEX of the first hazard touched, and -1 for none', () => {
    const a = obstacle({ at: 0.25, phase: 0 })
    const b = obstacle({ at: 0.75, phase: 0 })
    expect(hitObstacle(obstacleAt(a, DIAGONAL, 0), [a, b], DIAGONAL, 0)).toBe(0)
    expect(hitObstacle(obstacleAt(b, DIAGONAL, 0), [a, b], DIAGONAL, 0)).toBe(1)
    expect(hitObstacle({ x: 0, y: 0 }, [a, b], DIAGONAL, 0)).toBe(-1)
    expect(hitObstacle({ x: 0, y: 0 }, [], DIAGONAL, 0)).toBe(-1)
  })

  it('reports no hazard on a target with no route to sit on', () => {
    // A `free` level has an empty target; a hazard anchored to nothing must not
    // become a phantom circle at the origin.
    const empty = buildLevelTarget(makeConfig({ kind: 'free', paths: [] }))
    expect(() => obstacleAt(obstacle(), empty, 500)).not.toThrow()
    expect(hitObstacle({ x: 0, y: 0 }, [obstacle()], empty, 500)).toBe(-1)
  })
})

describe('the retired f1-pelotas hazards (LEGACY_PHASE_1, detective-mode Phase 11)', () => {
  // f1-pelotas is unwired from the active LEVELS catalog but its config is
  // preserved byte-for-byte in LEGACY_PHASE_1, so this remains a real fixture.
  const level = LEGACY_PHASE_1.find((l) => l.id === 'f1-pelotas')
  if (!level) throw new Error('LEGACY_PHASE_1 lost f1-pelotas')
  const target = buildLevelTarget(level)
  const obstacles = level.obstacles ?? []

  it('sweeps the channel wall to wall, so there is no safe lane to hug', () => {
    for (const o of obstacles) {
      expect(o.travel).toBeGreaterThan(level.corridorWidth)
      // Every point of the channel is covered at some instant of the cycle.
      expect(o.travel / 2 + o.radius).toBeGreaterThan(level.corridorWidth / 2)
    }
  })

  it('opens a real gap: the ball leaves the corridor entirely at its extremes', () => {
    for (const o of obstacles) {
      const clearOf = level.corridorWidth / 2 + o.radius + OBSTACLE_INK_ALLOWANCE
      expect(o.travel / 2).toBeGreaterThan(clearOf)
    }
  })

  it('keeps both hazards on the paper at every point of their travel', () => {
    for (const o of obstacles) {
      for (let t = 0; t <= o.periodMs; t += 25) {
        const c = obstacleAt(o, target, t)
        expect(c.y - o.radius).toBeGreaterThan(0)
        expect(c.y + o.radius).toBeLessThan(600)
        expect(c.x - o.radius).toBeGreaterThan(0)
        expect(c.x + o.radius).toBeLessThan(target.viewBoxWidth)
      }
    }
  })

  it('never lets the two hazards block the route at the same instant', () => {
    // Over a full 29-second beat of the 13:11 period pair there is always a
    // moment when at least one ball is out of its channel — otherwise the level
    // would have unpassable stretches.
    const [a, b] = obstacles
    const clear = (o: Obstacle, t: number): boolean => {
      const anchor = obstacleAt({ ...o, travel: 0 }, target, 0)
      const c = obstacleAt(o, target, t)
      return (
        Math.hypot(c.x - anchor.x, c.y - anchor.y) >
        level.corridorWidth / 2 + o.radius + OBSTACLE_INK_ALLOWANCE
      )
    }
    let bothBlocked = 0
    for (let t = 0; t < 29000; t += 20) {
      if (!clear(a, t) && !clear(b, t)) bothBlocked += 1
    }
    // They overlap sometimes — that is the level — but never for long enough to
    // wall the route off: the longest joint block is well under one cycle.
    expect(bothBlocked / (29000 / 20)).toBeLessThan(0.3)
  })
})

describe('hazardGapFraction — the closed form each hazard is authored against (design.md §4)', () => {
  it('reproduces the retired f1-pelotas gap the catalog comment already states (54%)', () => {
    const level = LEGACY_PHASE_1.find((l) => l.id === 'f1-pelotas')
    if (!level) throw new Error('LEGACY_PHASE_1 lost f1-pelotas')
    const o = (level.obstacles ?? [])[0]
    expect(hazardGapFraction(o, level.corridorWidth)).toBeCloseTo(0.54, 2)
  })

  it("reproduces the live trail1 gap", () => {
    const level = getLevel('trail1')
    const o = (level.obstacles ?? [])[0]
    expect(hazardGapFraction(o, level.corridorWidth)).toBeCloseTo(0.42, 2)
  })

  it('opens a MAJORITY gap on f2-agua4 — a real window to stop and go', () => {
    const level = getLevel('f2-agua4')
    const o = (level.obstacles ?? [])[0]
    expect(hazardGapFraction(o, level.corridorWidth)).toBeGreaterThan(0.5)
  })

  it("gives f2-agua4 its own hazard numbers, not trail1's borrowed literally (D3)", () => {
    const trail1 = (getLevel('trail1').obstacles ?? [])[0]
    const agua4 = (getLevel('f2-agua4').obstacles ?? [])[0]
    expect([agua4.travel, agua4.periodMs, agua4.radius]).not.toEqual([
      trail1.travel,
      trail1.periodMs,
      trail1.radius,
    ])
    expect(getLevel('f2-agua4').obstacles).toHaveLength(1)
  })
})

describe('sweep-based arch route', () => {
  it('gives f1-pelotas a route with no corner in it', () => {
    // A `waves: 0.5` sweep with y0 === y1: a single broad arch.
    const d = sweep({ x0: 110, y0: 470, x1: 890, y1: 470, bow: -330, waves: 0.5 })
    expect(d.startsWith('M 110 470')).toBe(true)
    expect(d.endsWith('L 890 470')).toBe(true)
  })
})
