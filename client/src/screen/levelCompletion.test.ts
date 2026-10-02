// T39 (`odd/tasks/prewriting-stage-completion.md`, tablet play-test): "I
// finished every spine on the hedgehog, they all appeared, and the level did
// not end" / "I coloured all 3 snakes and the level still did not end".
//
// These tests replay a WHOLE attempt through the same decision
// `LevelPlay.tsx`'s `onRelease` makes (`releaseOutcome`), feeding it exactly
// what the canvas hands a release: the stroke buffer as it stands at that
// moment — which is NOT always every stroke of the attempt. The canvas
// buffer is emptied between two releases of the same attempt by:
//  - `onStart`'s clear-on-failed-retry (every drawn-place `path` level, so
//    every snake level: each piece's own release is unapproved until the
//    last, so the NEXT touch wipes the buffer);
//  - any re-run of `resetSurface` mid-attempt (the adaptive widen after
//    three unapproved releases used to re-fire the level's mount effect —
//    `game/adaptiveTolerance.ts`'s `applyAttempt` is replayed below so the
//    wipe lands on exactly the release it lands on in the app).
// Whatever the buffer holds, a level whose parts are all visibly done must
// report an approved attempt.
import { describe, expect, it } from 'vitest'
import { applyAttempt } from '../game/adaptiveTolerance'
import { evaluateLevel } from '../game/evaluateLevel'
import { EMPTY_RECORD, type LevelRecord } from '../game/types'
import type { Point } from '../letters/types'
import { buildLevelTarget } from '../levels/buildLevel'
import { getLevel } from '../levels/catalog'
import { EMPTY_SPINES, spineAnchors, type SpineState } from '../levels/spines'
import { EMPTY_WAYPOINTS, waypointTick, type WaypointState } from '../levels/waypoints'
import { releaseOutcome } from './levelCompletion'
import { emptySegmentState, settleSegmentRelease } from '../levels/segments'
import { emptySnakeColourState, snakeColourTick, type SnakeColourState } from './snakeColour'

/** A plain outward drag from an anchor, sampled like a pointer stream. */
function outwardStroke(anchor: { x: number; y: number; nx: number; ny: number }, len: number): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    pts.push({ x: anchor.x + anchor.nx * len * t, y: anchor.y + anchor.ny * len * t })
  }
  return pts
}

describe('hedgehog: drawing every spine completes the level (T39)', () => {
  for (const id of ['hedgehog1', 'hedgehog2', 'hedgehog3', 'hedgehog4']) {
    it(`${id}: the last spine approves, even after the buffer was emptied by an adaptive widen`, () => {
      const level = getLevel(id)
      const cfg = level.spines!
      const anchors = spineAnchors(cfg)
      const len = (cfg.rules.lenMin + cfg.rules.lenMax) / 2
      let record: LevelRecord = EMPTY_RECORD
      let latch: SpineState = EMPTY_SPINES
      let buffer: Point[][] = []
      let wipes = 0
      const approvals: boolean[] = []
      for (const anchor of anchors) {
        buffer = [...buffer, outwardStroke(anchor, len)]
        const target = buildLevelTarget(level, record.widthFactor)
        const out = releaseOutcome({
          evaluated: evaluateLevel(buffer, target, 'touch'),
          snapshot: buffer,
          spines: { prev: latch, cfg },
        })
        expect(out.spineAccepted).toBe(true)
        latch = out.spineState!
        approvals.push(out.attempt.approved)
        const next = applyAttempt(record, out.attempt)
        if (next.widthFactor !== record.widthFactor) {
          buffer = []
          wipes++
        }
        record = next
      }
      // The replay really exercised the wipe (8-11 spines ≥ 3 unapproved).
      expect(wipes).toBeGreaterThan(0)
      expect(latch.filled.size).toBe(anchors.length)
      expect(approvals.slice(0, -1).every((a) => !a)).toBe(true)
      expect(approvals[approvals.length - 1]).toBe(true)
    })
  }

  it('a release fills at most ONE spine, and only when its own stroke is a spine', () => {
    const cfg = getLevel('hedgehog1').spines!
    const anchors = spineAnchors(cfg)
    const len = (cfg.rules.lenMin + cfg.rules.lenMax) / 2
    const good = outwardStroke(anchors[0], len)
    // Inward: from the anchor straight back into the body — never a spine.
    const bad: Point[] = [
      { x: anchors[0].x, y: anchors[0].y },
      { x: cfg.body.centre.x, y: cfg.body.centre.y },
    ]
    const first = releaseOutcome({
      evaluated: evaluateLevel([good], buildLevelTarget(getLevel('hedgehog1')), 'touch'),
      snapshot: [good],
      spines: { prev: EMPTY_SPINES, cfg },
    })
    expect(first.spineState!.filled.size).toBe(1)
    const second = releaseOutcome({
      evaluated: evaluateLevel([good, bad], buildLevelTarget(getLevel('hedgehog1')), 'touch'),
      snapshot: [good, bad],
      spines: { prev: first.spineState!, cfg },
    })
    expect(second.spineAccepted).toBe(false)
    expect(second.spineState!.filled.size).toBe(1)
  })
})

describe('snakes: colouring all three completes the level (T39)', () => {
  /** Drag along one piece's own route, folding every sample into the
   *  colour latch the way `onFrame` does. */
  function traceRoute(
    colour: SnakeColourState,
    routes: ReturnType<typeof buildLevelTarget>['routes'],
    i: number,
    corridorWidth: number,
    now: number,
  ): { colour: SnakeColourState; stroke: Point[] } {
    const stroke: Point[] = []
    const poly = routes[i].polyline
    for (let k = 0; k < poly.length - 1; k++) {
      for (let s = 0; s < 4; s++) {
        const t = s / 4
        const p = { x: poly[k].x + (poly[k + 1].x - poly[k].x) * t, y: poly[k].y + (poly[k + 1].y - poly[k].y) * t }
        stroke.push(p)
        colour = snakeColourTick(colour, routes, p, true, corridorWidth, now++)
      }
    }
    const end = poly[poly.length - 1]
    stroke.push(end)
    colour = snakeColourTick(colour, routes, end, true, corridorWidth, now++)
    // The finger lifts: `onFrame` keeps ticking with `drawing: false`.
    colour = snakeColourTick(colour, routes, null, false, corridorWidth, now + 1000)
    return { colour, stroke }
  }

  for (const id of ['snake1', 'snake2', 'snake3', 'snake4']) {
    it(`${id}: the release that colours the last snake approves`, () => {
      const level = getLevel(id)
      let record: LevelRecord = EMPTY_RECORD
      let colour = emptySnakeColourState(level.paths.length)
      let buffer: Point[][] = []
      let lastApproved = false
      const approvals: boolean[] = []
      for (let i = 0; i < level.paths.length; i++) {
        const target = buildLevelTarget(level, record.widthFactor)
        // `onStart`: a fresh touch after an unapproved release wipes the
        // buffer (clear-on-failed-retry, every drawn-place path level).
        if (i > 0 && !lastApproved) buffer = []
        const traced = traceRoute(colour, target.routes, i, target.corridorWidth, 1000 * (i + 1) * 100)
        colour = traced.colour
        buffer = [...buffer, traced.stroke]
        const out = releaseOutcome({
          evaluated: evaluateLevel(buffer, target, 'touch'),
          snapshot: buffer,
          snakes: colour,
        })
        lastApproved = out.attempt.approved
        approvals.push(lastApproved)
        record = applyAttempt(record, out.attempt)
      }
      expect(colour.pieces.every((p) => p.done)).toBe(true)
      expect(approvals.slice(0, -1).every((a) => !a)).toBe(true)
      expect(approvals[approvals.length - 1]).toBe(true)
    })
  }
})

describe('bee: a hazard restart keeps the opened flowers, and they still finish the level (T41)', () => {
  const level = getLevel('bee3')
  const cfg = level.waypoints!
  const target = buildLevelTarget(level)
  /** A straight drag between two sheet points, sampled like a pointer. */
  const leg = (a: Point, b: Point): Point[] =>
    Array.from({ length: 21 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 20, y: a.y + ((b.y - a.y) * i) / 20 }))
  const [f1, f2, f3] = cfg.stops

  it('the release that reaches the hive approves, though the restart emptied the buffer', () => {
    // First run: start → flower 1 → flower 2, then the leaf restarts the run
    // (the canvas buffer is emptied, the latch keeps both flowers).
    const first = [...leg(cfg.start, f1), ...leg(f1, f2)]
    let latch: WaypointState = waypointTick(EMPTY_WAYPOINTS, first, true, cfg)
    expect(latch.lit.size).toBe(2)
    latch = { ...latch, seen: 0 } // `restartRun`
    // Second run, from the start again: only flower 3 and the hive.
    const second = [...leg(cfg.start, f3), ...leg(f3, cfg.goal)]
    latch = waypointTick(latch, second, true, cfg)
    const evaluated = evaluateLevel([second], target, 'touch')
    const outcome = releaseOutcome({ evaluated, snapshot: [second], waypoints: { state: latch, cfg } })
    expect(outcome.attempt.approved).toBe(true)
    expect(outcome.attempt.accuracy).toBe(100)
  })

  it('does not approve while a flower is still closed', () => {
    const stroke = [...leg(cfg.start, f1), ...leg(f1, cfg.goal)]
    const latch = waypointTick(EMPTY_WAYPOINTS, stroke, true, cfg)
    const evaluated = evaluateLevel([stroke], target, 'touch')
    const outcome = releaseOutcome({ evaluated, snapshot: [stroke], waypoints: { state: latch, cfg } })
    expect(outcome.attempt.approved).toBe(false)
  })
})

// [T45] A segment level (`sheep-lana`, `turtle-huellas`): one release per
// segment, and `onStart`'s clear-on-failed-retry empties the buffer before
// every one but the first — the exact snake situation above. Replayed the
// way `LevelPlay.onRelease` runs it: each release sees only its own stroke.
describe('a segment level completes on its last segment, whatever the buffer holds', () => {
  for (const id of ['sheep-lana', 'turtle-huellas']) {
    it(id, () => {
      const level = getLevel(id)
      const target = buildLevelTarget(level)
      let state = emptySegmentState(target.routes.length)
      const approvals: boolean[] = []
      target.routes.forEach((route) => {
        const a = route.polyline[0]
        const b = route.polyline[route.polyline.length - 1]
        const stroke = Array.from({ length: 31 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 30, y: a.y + ((b.y - a.y) * i) / 30 }))
        state = settleSegmentRelease(state, stroke, target.routes, target.corridorWidth, level.segments!).state
        const evaluated = evaluateLevel([stroke], target, 'touch')
        approvals.push(releaseOutcome({ evaluated, snapshot: [stroke], segments: state }).attempt.approved)
      })
      expect(approvals).toEqual(target.routes.map((_, i) => i === target.routes.length - 1))
    })
  }
})
