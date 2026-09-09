// Attempt-evaluation contract (docs/08 section 3). Every fixture is a synthetic
// stroke derived from a REAL catalog level, so the thresholds are exercised
// against the same geometry the child will trace.
import { describe, expect, it } from 'vitest'
import { resample } from '../canvas/resample'
import type { TracePoint } from '../canvas/useTraceInput'
import { buildLevelTarget } from '../levels/buildLevel'
import { getLevel } from '../levels/catalog'
import { coverageScore } from '../levels/coverage'
import type { LevelTarget } from '../levels/types'
import { TolPen, TolTouch } from '../canvas/validation/constants'
import { evaluateLevel, toleranceFor } from './evaluateLevel'

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

// The first phase-1 route: one long sweep across the whole sheet (docs/08 §5).
const travesia = buildLevelTarget(getLevel('f1-travesia'))
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
      ...getLevel('f1-travesia'),
      rules: { ...getLevel('f1-travesia').rules, enforceOrder: false },
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
    const wide = buildLevelTarget({ ...getLevel('f1-travesia'), corridorWidth: 220 })
    const narrow = buildLevelTarget({ ...getLevel('f1-travesia'), corridorWidth: 40 })
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
})
