// Attempt-evaluation contract (docs/08 section 3). Every fixture is a synthetic
// stroke derived from a REAL catalog level, so the thresholds are exercised
// against the same geometry the child will trace.
import { describe, expect, it } from 'vitest'
import { resample } from '../canvas/resample'
import type { TracePoint } from '../canvas/useTraceInput'
import { buildLevelTarget } from '../levels/buildLevel'
import { LEGACY_PHASE_1, getLevel } from '../levels/catalog'
import { coverageScore } from '../levels/coverage'
import type { LevelConfig, LevelTarget } from '../levels/types'
import { K, TolPen, TolTouch } from '../canvas/validation/constants'
import { evaluateLevel, resampleForScoring, toleranceFor } from './evaluateLevel'
import { spineAnchors, spineScore, type SpineConfig } from '../levels/spines'
import { waypointScore, type WaypointConfig } from '../levels/waypoints'

/**
 * A perfect trace: the target path resampled to EVEN ARC LENGTH and evenly
 * timed. The raw flattened polyline is uniform in curve PARAMETER, not in arc
 * length, so replaying it verbatim would read as a jerky hand — arc-length
 * resampling is what a steady 60fps capture of a steady hand actually looks
 * like.
 */
function perfectStroke(target: LevelTarget, dt = 16): TracePoint[] {
  return resample(target.polyline, 240).map((p, i) => ({ x: p.x, y: p.y, t: i * dt }))
}

/** Same stroke, shifted off the corridor. */
function offsetStroke(target: LevelTarget, dy: number): TracePoint[] {
  return perfectStroke(target).map((p) => ({ ...p, y: p.y + dy }))
}

/**
 * `f1-travesia` is retired behind `LEGACY_PHASE_1` (`detective-mode` Phase
 * 11) — still a real, fully-authored config, just unwired from the active
 * catalog. These fixtures only need a real long-sweep shape, not catalog
 * membership.
 */
function legacyLevel(id: string): LevelConfig {
  const level = LEGACY_PHASE_1.find((l) => l.id === id)
  if (!level) throw new Error(`Legacy level not found: ${id}`)
  return level
}

// The retired travesia route: one long sweep across the whole sheet (docs/08 §5).
const travesia = buildLevelTarget(legacyLevel('f1-travesia'))
const bucles = buildLevelTarget(getLevel('f2-bucles'))

describe('evaluateLevel — a faithful trace', () => {
  it('approves a stroke sampled off the target path', () => {
    const attempt = evaluateLevel([perfectStroke(travesia)], travesia, 'pen')
    expect(attempt.accuracy).toBe(100)
    expect(attempt.directionOk).toBe(true)
    expect(attempt.wrongDirection).toBe(false)
    expect(attempt.fluency).toBe(100)
    expect(attempt.extraLifts).toBe(0)
    expect(attempt.approved).toBe(true)
    expect(attempt.failedPillar).toBeNull()
  })

  it('approves the same trace on a curved, self-crossing level', () => {
    const attempt = evaluateLevel([perfectStroke(bucles)], bucles, 'touch')
    expect(attempt.accuracy).toBeGreaterThanOrEqual(bucles.config.rules.minAccuracy)
    expect(attempt.directionOk).toBe(true)
    expect(attempt.approved).toBe(true)
  })

  it('is forgiving of a touch pointer — a six-year-old finger is not a stylus', () => {
    const wobbly = perfectStroke(travesia).map((p, i) => ({ ...p, y: p.y + (i % 2 ? 9 : -9) }))
    const touch = evaluateLevel([wobbly], travesia, 'touch').accuracy
    const pen = evaluateLevel([wobbly], travesia, 'pen').accuracy
    expect(touch).toBeGreaterThanOrEqual(pen)
  })
})

describe('evaluateLevel — direction pillar', () => {
  it('flags a reversed stroke and blames direction', () => {
    const reversed = [...perfectStroke(travesia)].reverse().map((p, i) => ({ ...p, t: i * 16 }))
    const attempt = evaluateLevel([reversed], travesia, 'pen')
    expect(attempt.wrongDirection).toBe(true)
    expect(attempt.directionOk).toBe(false)
    expect(attempt.approved).toBe(false)
    expect(attempt.failedPillar).toBe('direction')
    // Geometrically it is the same line: accuracy is untouched. That is the
    // whole point of scoring direction separately.
    expect(attempt.accuracy).toBe(100)
  })

  it('keeps the wrongDirection flag for coaching when the level does not enforce order', () => {
    const relaxed = buildLevelTarget({
      ...legacyLevel('f1-travesia'),
      rules: { ...legacyLevel('f1-travesia').rules, enforceOrder: false },
    })
    const reversed = [...perfectStroke(relaxed)].reverse().map((p, i) => ({ ...p, t: i * 16 }))
    const attempt = evaluateLevel([reversed], relaxed, 'pen')
    expect(attempt.directionOk).toBe(true) // forced true: the pillar cannot block
    expect(attempt.wrongDirection).toBe(true) // but the truth survives for the message
    expect(attempt.approved).toBe(true)
  })
})

describe('evaluateLevel — accuracy pillar', () => {
  it('fails a stroke drawn 200px off the path', () => {
    const attempt = evaluateLevel([offsetStroke(travesia, 200)], travesia, 'pen')
    expect(attempt.accuracy).toBe(0)
    expect(attempt.approved).toBe(false)
    expect(attempt.failedPillar).toBe('accuracy')
  })

  it('scales tolerance with the corridor: a wide level is genuinely easier', () => {
    const wide = buildLevelTarget({ ...legacyLevel('f1-travesia'), corridorWidth: 220 })
    const narrow = buildLevelTarget({ ...legacyLevel('f1-travesia'), corridorWidth: 40 })
    const drift = 30
    expect(evaluateLevel([offsetStroke(wide, drift)], wide, 'pen').accuracy).toBeGreaterThan(
      evaluateLevel([offsetStroke(narrow, drift)], narrow, 'pen').accuracy,
    )
  })

  it('floors the tolerance scale at 0.7 — a narrow corridor is not a stylus test', () => {
    // Phase 3-5 corridors are narrow so the LETTER stays legible (docs/08 §5).
    // Unclamped, a 40px corridor would score touch at 26·0.5 = 13 viewBox
    // units — stricter than the pen tolerance, for a six-year-old's fingertip.
    expect(toleranceFor(40, 'touch')).toBeCloseTo(TolTouch * 0.7, 6)
    expect(toleranceFor(42, 'touch')).toBeCloseTo(TolTouch * 0.7, 6)
    expect(toleranceFor(0, 'pen')).toBeCloseTo(TolPen * 0.7, 6)
    expect(toleranceFor(40, 'touch')).toBeGreaterThan(TolPen)
  })

  it('caps the tolerance scale at 2.5 — a widened corridor still means something', () => {
    expect(toleranceFor(260, 'pen')).toBeCloseTo(TolPen * 2.5, 6)
    expect(toleranceFor(9000, 'touch')).toBeCloseTo(TolTouch * 2.5, 6)
  })

  it('scales linearly between the floor and the ceiling', () => {
    expect(toleranceFor(80, 'pen')).toBeCloseTo(TolPen, 6)
    expect(toleranceFor(160, 'pen')).toBeCloseTo(TolPen * 2, 6)
    expect(toleranceFor(56, 'touch')).toBeCloseTo(TolTouch * 0.7, 6)
  })

  it('keeps a narrow-corridor letter traceable by a wobbling finger', () => {
    const letter = buildLevelTarget(getLevel('f3-a'))
    const wobbly = perfectStroke(letter).map((p, i) => ({ ...p, y: p.y + (i % 2 ? 8 : -8) }))
    const attempt = evaluateLevel([wobbly], letter, 'touch')
    expect(letter.corridorWidth).toBeLessThan(80)
    expect(attempt.accuracy).toBeGreaterThanOrEqual(letter.config.rules.minAccuracy)
  })

  it('reports accuracy as an integer', () => {
    const attempt = evaluateLevel([offsetStroke(travesia, 20)], travesia, 'pen')
    expect(Number.isInteger(attempt.accuracy)).toBe(true)
  })
})

describe('resampleForScoring — multi-stroke accuracy (the art-corridor gap bug, snake1..4)', () => {
  it('is bit-identical to resample(stroke, k) for a single stroke', () => {
    const stroke = perfectStroke(travesia)
    expect(resampleForScoring([stroke], K)).toEqual(resample(stroke, K))
    expect(resampleForScoring([], K)).toEqual(resample([], K))
  })

  it('never spends a sample bridging a WIDE gap between two strokes', () => {
    // Two short, real strokes far apart on the sheet — the exact shape of an
    // art-corridor level's routes, `mustBeContinuous: false`: the child lifts
    // the finger between pieces on purpose.
    const near = { x: 100, y: 100 }
    const far = { x: 900, y: 100 }
    const a = [near, { x: near.x + 20, y: near.y }]
    const b = [far, { x: far.x + 20, y: far.y }]
    const points = resampleForScoring([a, b], K)
    // Every sample lands within the 20-unit span of ONE of the two strokes —
    // never in the 780-unit gap between them, the way naive
    // `resample([...a, ...b], K)` would spend a third of its samples doing.
    for (const p of points) {
      const nearA = p.x >= near.x - 1 && p.x <= near.x + 21
      const nearB = p.x >= far.x - 1 && p.x <= far.x + 21
      expect(nearA || nearB).toBe(true)
    }
  })

  it('a perfect trace of every snake1..4 route now clears its own minAccuracy — it did not before this fix', () => {
    // Regression for "snakes: impossible to pass" (odd/tasks/prewriting-
    // stage-completion.md, T1): even a mathematically perfect trace of the
    // engine's OWN routes used to fail, because `resample(all, K)` on the
    // naive concatenation burned samples on the empty sand between pieces.
    // `snake3` (three separate ~200-400-unit gaps) hit this hardest: a
    // perfect trace scored accuracy 0 against the OLD `resample(all, K)`.
    for (const id of ['snake1', 'snake2', 'snake3', 'snake4']) {
      const target = buildLevelTarget(getLevel(id))
      let t = 0
      const strokes = target.routes.map((route) =>
        resample([...route.polyline], 240).map((p) => {
          t += 16
          return { x: p.x, y: p.y, t }
        }),
      )
      const attempt = evaluateLevel(strokes, target, 'touch')
      expect(attempt.accuracy).toBeGreaterThanOrEqual(target.config.rules.minAccuracy)
      expect(attempt.approved).toBe(true)
    }
  })
})

describe('evaluateLevel — fluency pillar', () => {
  it('charges an extra lift when a continuous level is traced in two strokes', () => {
    const points = perfectStroke(bucles)
    const mid = Math.floor(points.length / 2)
    const single = evaluateLevel([points], bucles, 'pen')
    const split = evaluateLevel([points.slice(0, mid), points.slice(mid)], bucles, 'pen')
    expect(bucles.config.rules.mustBeContinuous).toBe(true)
    expect(single.extraLifts).toBe(0)
    expect(split.extraLifts).toBe(1)
    expect(split.fluency).toBe(single.fluency - 25)
  })

  it('does not approve a continuous level traced in two hesitant strokes', () => {
    const points = perfectStroke(bucles)
    const mid = Math.floor(points.length / 2)
    // The second stroke is restarted with a lurching rhythm — the real shape of
    // a child who lifts, loses the thread and pushes through in jerks.
    const second = points.slice(mid).map((p, i) => ({ ...p, t: i * (i % 2 === 0 ? 4 : 120) }))
    const attempt = evaluateLevel([points.slice(0, mid), second], bucles, 'pen')
    expect(attempt.extraLifts).toBe(1)
    expect(attempt.fluency).toBeLessThan(bucles.config.rules.minFluency)
    expect(attempt.approved).toBe(false)
    expect(attempt.failedPillar).toBe('fluency')
    // Accuracy and direction are intact: the child drew the right shape the
    // right way, in the wrong number of movements.
    expect(attempt.accuracy).toBeGreaterThanOrEqual(bucles.config.rules.minAccuracy)
    expect(attempt.directionOk).toBe(true)
  })

  it('never charges a lift on a level that allows them', () => {
    const points = perfectStroke(travesia)
    const mid = Math.floor(points.length / 2)
    const attempt = evaluateLevel([points.slice(0, mid), points.slice(mid)], travesia, 'pen')
    expect(travesia.config.rules.mustBeContinuous).toBe(false)
    expect(attempt.extraLifts).toBe(0)
    expect(attempt.approved).toBe(true)
  })
})

describe('evaluateLevel — failedPillar ordering', () => {
  it('blames accuracy before direction and fluency', () => {
    const wrecked = [...offsetStroke(travesia, 300)].reverse().map((p, i) => ({ ...p, t: i * 16 }))
    const attempt = evaluateLevel([wrecked], travesia, 'pen')
    expect(attempt.accuracy).toBe(0)
    expect(attempt.failedPillar).toBe('accuracy')
  })
})

describe('evaluateLevel — degenerate input', () => {
  it('fails everything when fewer than two points were captured', () => {
    for (const strokes of [[], [[]], [[{ x: 10, y: 10 }]]]) {
      const attempt = evaluateLevel(strokes, travesia, 'pen')
      expect(attempt).toMatchObject({
        accuracy: 0,
        fluency: 0,
        directionOk: false,
        approved: false,
        failedPillar: 'accuracy',
      })
    }
  })

  it('does not crash without timestamps', () => {
    const noTime = travesia.polyline.map((p) => ({ x: p.x, y: p.y }))
    expect(() => evaluateLevel([noTime], travesia, 'pen')).not.toThrow()
    expect(evaluateLevel([noTime], travesia, 'pen').approved).toBe(true)
  })
})

describe('evaluateLevel — nivel libre: la precisión es cobertura', () => {
  const libre = buildLevelTarget(getLevel('f1-libre'))

  /** Sample a parametric curve into a stroke of `n + 1` evenly timed points. */
  function scribble(n = 600): TracePoint[] {
    const out: TracePoint[] = []
    for (let i = 0; i <= n; i++) {
      const t = i / n
      out.push({
        x: 500 + 430 * Math.sin(3 * 2 * Math.PI * t),
        y: 300 + 260 * Math.sin(2 * 2 * Math.PI * t + 0.7),
        t: i * 16,
      })
    }
    return out
  }

  it('scores accuracy as the share of the sheet the stroke reached', () => {
    const attempt = evaluateLevel([scribble()], libre, 'touch')
    expect(attempt.accuracy).toBe(coverageScore([scribble()], libre.viewBoxWidth))
    expect(attempt.approved).toBe(true)
    expect(attempt.failedPillar).toBeNull()
  })

  it('never fails the direction pillar — there is no right way round', () => {
    const backwards = [...scribble()].reverse().map((p, i) => ({ ...p, t: i * 16 }))
    const attempt = evaluateLevel([backwards], libre, 'touch')
    expect(attempt.directionOk).toBe(true)
    expect(attempt.wrongDirection).toBe(false)
  })

  it('blames accuracy when the child barely moved', () => {
    const attempt = evaluateLevel(
      [[{ x: 200, y: 300, t: 0 }, { x: 420, y: 300, t: 300 }]],
      libre,
      'touch',
    )
    expect(attempt.accuracy).toBeLessThan(libre.config.rules.minAccuracy)
    expect(attempt.approved).toBe(false)
    expect(attempt.failedPillar).toBe('accuracy')
  })

  it('counts no extra lifts — a warm-up may be drawn in as many strokes as it takes', () => {
    const half = Math.floor(scribble().length / 2)
    const points = scribble()
    const attempt = evaluateLevel([points.slice(0, half), points.slice(half)], libre, 'touch')
    expect(libre.config.rules.mustBeContinuous).toBe(false)
    expect(attempt.extraLifts).toBe(0)
    expect(attempt.approved).toBe(true)
  })

  it('survives an empty attempt without crashing on the missing path', () => {
    const attempt = evaluateLevel([], libre, 'touch')
    expect(attempt.accuracy).toBe(0)
    expect(attempt.directionOk).toBe(true)
    expect(attempt.approved).toBe(false)
    expect(attempt.failedPillar).toBe('accuracy')
  })

  it('leaves the routed levels on the accuracy path, untouched', () => {
    // The free branch must not leak: a path level still scores against its
    // corridor and still fails a reversed stroke.
    const reversed = [...perfectStroke(travesia)].reverse().map((p, i) => ({ ...p, t: i * 16 }))
    expect(evaluateLevel([reversed], travesia, 'pen').wrongDirection).toBe(true)
  })

  it("any pre-existing kind:'free' level scores identically, byte for byte, before and after this change", () => {
    // `f1-libre` carries no `waypoints` field, so the conditional must fall
    // through to the exact same `revealScore` call it always made.
    for (const strokes of [[scribble()], [], [[{ x: 200, y: 300, t: 0 }, { x: 420, y: 300, t: 300 }]]]) {
      const before = coverageScore(strokes, libre.viewBoxWidth)
      const after = evaluateLevel(strokes, libre, 'touch')
      expect(after.accuracy).toBe(before)
    }
  })
})

describe('evaluateLevel — a bee fixture routes through waypointScore, not revealScore', () => {
  const waypoints: WaypointConfig = {
    start: { x: 250, y: 400 },
    stops: [{ x: 500, y: 265, radius: 110 }],
    stopArt: { dormant: { href: '/art/sector-flower-dormant.png', w: 256, h: 245 }, lit: { href: '/art/sector-flower.png', w: 256, h: 245 } },
    stopSize: 64,
    goal: { x: 750, y: 385, radius: 96 },
    goalArt: { href: '/art/sector-honeycomb.png', w: 181, h: 256 },
    goalSize: 96,
  }
  const beeLike: LevelTarget = {
    ...buildLevelTarget(getLevel('f1-libre')),
    config: { ...getLevel('f1-libre'), waypoints },
  }

  it('scores accuracy as waypointScore, not coverageScore, when the level authors waypoints', () => {
    const strokes = [[{ x: waypoints.stops[0].x, y: waypoints.stops[0].y, t: 0 }]]
    const attempt = evaluateLevel(strokes, beeLike, 'touch')
    expect(attempt.accuracy).toBe(waypointScore(strokes, waypoints))
    // Sanity: this is NOT what coverageScore would report for one point.
    expect(attempt.accuracy).not.toBe(coverageScore(strokes, beeLike.viewBoxWidth))
  })

  it('reports the same accuracy waypointScore itself computes, across the 0/50/100 range', () => {
    const cases: ReadonlyArray<ReadonlyArray<ReadonlyArray<TracePoint>>> = [
      [],
      [[{ x: waypoints.stops[0].x, y: waypoints.stops[0].y, t: 0 }]],
      [
        [
          { x: waypoints.stops[0].x, y: waypoints.stops[0].y, t: 0 },
          { x: waypoints.goal.x, y: waypoints.goal.y, t: 100 },
        ],
      ],
    ]
    for (const strokes of cases) {
      expect(evaluateLevel(strokes, beeLike, 'touch').accuracy).toBe(waypointScore(strokes, waypoints))
    }
  })
})

describe('evaluateLevel — a hedgehog fixture routes through spineScore, ahead of waypointScore/revealScore (radial-spines capability)', () => {
  const spines: SpineConfig = {
    pose: 'curled',
    body: { centre: { x: 500, y: 300 }, height: 300 },
    arc: { from: 65, to: 365 },
    count: 8,
    rules: { baseRadius: 30, tolDeg: 30, straightness: 0.85, lenMin: 80, lenMax: 160 },
  }
  const hedgehogLike: LevelTarget = {
    ...buildLevelTarget(getLevel('f1-libre')),
    config: { ...getLevel('f1-libre'), spines },
  }

  /** A straight two-point stroke from `anchor`, outward along its own
   *  normal — the same fixture helper `spines.test.ts` uses. */
  function idealStroke(i: number, len: number) {
    const a = spineAnchors(spines)[i]
    return [
      { x: a.x, y: a.y, t: 0 },
      { x: a.x + a.nx * len, y: a.y + a.ny * len, t: 100 },
    ]
  }

  it('scores accuracy as spineScore, not waypointScore/revealScore, when the level authors spines', () => {
    const len = (spines.rules.lenMin + spines.rules.lenMax) / 2
    const strokes = [idealStroke(0, len)]
    const attempt = evaluateLevel(strokes, hedgehogLike, 'touch')
    expect(attempt.accuracy).toBe(spineScore(strokes, spines))
    expect(attempt.accuracy).toBe(Math.round(100 / spines.count))
  })

  it('reports the same accuracy spineScore itself computes, across a growing fill count', () => {
    const len = (spines.rules.lenMin + spines.rules.lenMax) / 2
    const cases: ReadonlyArray<ReadonlyArray<ReadonlyArray<TracePoint>>> = [
      [],
      [idealStroke(0, len)],
      [idealStroke(0, len), idealStroke(1, len), idealStroke(2, len)],
    ]
    for (const strokes of cases) {
      expect(evaluateLevel(strokes, hedgehogLike, 'touch').accuracy).toBe(spineScore(strokes, spines))
    }
  })
})
