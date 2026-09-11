// Corridor-wall distance contract (`detective-mode` defect fix: "the corridor
// walls do nothing"). Pinned against the REAL catalog geometry for all four
// maze trails, exactly like `directionArrow.test.ts` pins the arrow math —
// the shape of these paths (a wide sine wave, a tight spiral, sharp-corner
// triangular/square waves) is what made the old whole-cloud check fail in
// the first place, so a synthetic straight-line fixture would not prove
// anything.
import { describe, expect, it } from 'vitest'
import { buildLevelTarget } from '../levels/buildLevel'
import { LEVELS } from '../levels/catalog'
import { pointAtArcLength } from '../letters/svgLetter'
import type { Point } from '../letters/types'
import type { LevelTarget } from '../levels/types'
import { corridorTick, CORRIDOR_TRACK_START } from './corridorTrack'
// The end-to-end suite at the bottom drives the real collection reducer from
// the real track, which is the only place the two meet outside `LevelPlay`.
import { clueCountFor, clueMarks, clueTick, emptyClueState, reachedTrailEnd } from '../detective/clues'

function trailTarget(id: string): LevelTarget {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Level not found: ${id}`)
  return buildLevelTarget(level)
}

/** A point offset perpendicular to the route at arc length `arc`, `offset`
 * units off the centreline — the same perpendicular-band construction
 * `buildLevel.ts`'s `pushBand` uses for the ideal cloud itself, built here
 * from the public arc-length API so the fixture needs no internals. */
function offPoint(target: LevelTarget, arc: number, offset: number): Point {
  const polyline = target.polyline as Point[]
  const point = pointAtArcLength(polyline, arc)
  const ahead = pointAtArcLength(polyline, Math.min(target.length, arc + 20))
  const dx = ahead.x - point.x
  const dy = ahead.y - point.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  return { x: point.x + nx * offset, y: point.y + ny * offset }
}

/**
 * The OLD, buggy check `LevelPlay.tsx` used before this fix: nearest distance
 * to the WHOLE ideal cloud (every path, every arm, unioned — exactly what
 * `neighbourhoodNearest` over `buildIdealGrid` computed), against the SAME
 * `> corridorWidth / 2` threshold. Kept here, deliberately, only to prove the
 * new local check below can fail: a wavy or spiralled route puts a stray arm
 * of the cloud within reach of a point that is genuinely far outside the
 * LOCAL corridor, so this reports "inside" when it should not.
 */
function oldWholeCloudOut(target: LevelTarget, x: number, y: number): boolean {
  let best = Infinity
  for (const [px, py] of target.ideal) {
    const d = Math.hypot(x - px, y - py)
    if (d < best) best = d
  }
  return best > target.corridorWidth / 2
}

describe('corridorTick — local wall distance (defect 1)', () => {
  const trails = ['trail1', 'trail2', 'trail3', 'trail4'] as const

  it.each(trails)('%s: flags out at/just past the wall, not while inside', (id) => {
    const target = trailTarget(id)
    const half = target.corridorWidth / 2
    const arc = target.length / 2

    for (const offset of [0, half / 2]) {
      const p = offPoint(target, arc, offset)
      const sample = corridorTick(target.polyline, target.length, { arc, maxArc: arc }, p.x, p.y)
      expect(sample.distance).toBeLessThanOrEqual(half)
    }
    for (const offset of [half + 3, half * 2, half * 4]) {
      const p = offPoint(target, arc, offset)
      const sample = corridorTick(target.polyline, target.length, { arc, maxArc: arc }, p.x, p.y)
      expect(sample.distance).toBeGreaterThan(half)
    }
  })

  it('measures perpendicular distance monotonically with the offset (regression: the old cloud check was not even monotonic)', () => {
    const target = trailTarget('trail1')
    const arc = target.length / 2
    const offsets = [0, 20, 45, 68, 90, 180]
    const distances = offsets.map((offset) => {
      const p = offPoint(target, arc, offset)
      return corridorTick(target.polyline, target.length, { arc, maxArc: arc }, p.x, p.y).distance
    })
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThan(distances[i - 1])
    }
  })

  it('the OLD whole-cloud check misses a trace 4x past the wall on trail1 — proof the new test is not vacuous', () => {
    const target = trailTarget('trail1')
    const half = target.corridorWidth / 2
    const arc = target.length / 2
    const farOut = offPoint(target, arc, half * 4)

    // The bug this change fixes: the old whole-cloud check reads this as
    // INSIDE (some other arm of the wave is close enough), while the new
    // local check correctly reads it as outside.
    expect(oldWholeCloudOut(target, farOut.x, farOut.y)).toBe(false)
    const sample = corridorTick(target.polyline, target.length, { arc, maxArc: arc }, farOut.x, farOut.y)
    expect(sample.distance).toBeGreaterThan(half)
  })

  it('advances the track forward as the fingertip follows the route', () => {
    const target = trailTarget('trail1')
    let track = CORRIDOR_TRACK_START
    let lastArc = -1
    // Steps within `CORRIDOR_WINDOW_FORWARD` (260) — a realistic per-sample
    // advance. A jump larger than the window is a fingertip teleporting, not
    // something a ~30 Hz sampler needs to track through.
    for (const arc of [0, 150, 300, 450, 600, 750, 900]) {
      const p = pointAtArcLength(target.polyline as Point[], arc)
      const sample = corridorTick(target.polyline, target.length, track, p.x, p.y)
      expect(sample.distance).toBeLessThan(1)
      expect(sample.track.arc).toBeGreaterThan(lastArc)
      lastArc = sample.track.arc
      track = sample.track
    }
  })

  it('returns Infinity for a route-less target (kind: free) rather than throwing', () => {
    const sample = corridorTick([], 0, CORRIDOR_TRACK_START, 10, 10)
    expect(sample.distance).toBe(Infinity)
  })
})

describe('CorridorTrack.maxArc (the monotone progress `arc` cannot provide)', () => {
  it('starts at zero on a fresh run', () => {
    expect(CORRIDOR_TRACK_START).toEqual({ arc: 0, maxArc: 0 })
  })

  it('does NOT slide backwards when the fingertip wobbles back, though `arc` does', () => {
    // The exact situation `CORRIDOR_WINDOW_BACK` (150) exists to handle: the
    // window deliberately reaches behind the tracked position, so a fingertip
    // that hesitates and drifts back down the route pulls `arc` back with it.
    // That is right for measuring the local wall and useless as progress,
    // which is the whole reason `maxArc` exists.
    const target = trailTarget('trail1')
    const polyline = target.polyline as Point[]
    let track = CORRIDOR_TRACK_START
    for (const arc of [0, 200, 400]) {
      const p = pointAtArcLength(polyline, arc)
      track = corridorTick(target.polyline, target.length, track, p.x, p.y).track
    }
    const peak = track.maxArc
    expect(peak).toBeGreaterThan(390)

    // Now walk BACK 100 units, well inside the backward window.
    const back = pointAtArcLength(polyline, 300)
    const wobbled = corridorTick(target.polyline, target.length, track, back.x, back.y).track
    expect(wobbled.arc).toBeLessThan(peak) // `arc` really did retreat
    expect(wobbled.maxArc).toBe(peak) // progress did not
  })

  it('never decreases across a whole walk of the route, on every shipped trail', () => {
    for (const id of ['trail1', 'trail2', 'trail3', 'trail4']) {
      const target = trailTarget(id)
      const polyline = target.polyline as Point[]
      let track = CORRIDOR_TRACK_START
      let last = 0
      // A deliberately jittery walk: two steps forward, one back, the way a
      // six-year-old's finger actually moves.
      // The endpoint is appended explicitly: a fixed stride stops at the last
      // multiple below `length` and would leave the walk short of the finish
      // for reasons that belong to this loop, not to the product.
      const stops: number[] = []
      for (let arc = 0; arc < target.length; arc += 120) stops.push(arc)
      stops.push(target.length)
      for (const arc of stops) {
        for (const probe of [arc, Math.max(0, arc - 40)]) {
          const p = pointAtArcLength(polyline, Math.min(target.length, probe))
          track = corridorTick(target.polyline, target.length, track, p.x, p.y).track
          expect(track.maxArc, `${id} at arc ${probe}`).toBeGreaterThanOrEqual(last)
          last = track.maxArc
        }
      }
      // And it got all the way to the end, which is what makes the trail
      // completable at all (`reachedTrailEnd`).
      expect(last, `${id} final progress`).toBeGreaterThan(
        target.length - target.corridorWidth / 2,
      )
    }
  })
})


describe("THE USER'S RULE, end to end: never left the path ⇒ every clue lit on arrival", () => {
  // What a screenshot cannot show. Neither the headless renderer nor any test
  // in this repo can drive real pointer input, so the picture of a lit clue
  // and of a drawn mud trail is genuinely unverified by eye — this is the
  // check that stands in for it, and it is a stronger one: it drives the SAME
  // two pure modules `LevelPlay`'s `onFrame` drives, over the REAL catalog
  // geometry, for a walk deliberately chosen to be as ugly as the rules allow.
  //
  // "As ugly as the rules allow" is the whole point. The defect this replaced
  // lit marks on PROXIMITY to their drawn point, so it rewarded a centred
  // line; the user's rule rewards a line that stayed INSIDE, however far from
  // the middle it wandered. So the walk below hugs one wall at 90% of the
  // corridor's half-width and crosses to the other side halfway through,
  // which is legal on every sample and would have left marks dark under the
  // old rule.
  for (const id of ['trail1', 'trail2', 'trail3', 'trail4']) {
    it(`${id}: a wall-hugging walk stays inside, reaches the end, and earns every mark`, () => {
      const level = LEVELS.find((l) => l.id === id)
      if (!level?.clue) throw new Error(`${id} is not a detective trail`)
      const target = trailTarget(id)
      const half = target.corridorWidth / 2
      const marks = clueMarks(
        target.polyline,
        target.length,
        clueCountFor(target.length, level.clue.spacing),
        level.clue.kind,
      )

      let track = CORRIDOR_TRACK_START
      let state = emptyClueState(marks.length)
      let everLeft = false
      // ~30 Hz over a route walked at a child's pace: a sample every 15 units
      // of arc, which is finer than the mark spacing (~60) by design.
      for (let arc = 0; arc <= target.length; arc += 15) {
        const at = Math.min(arc, target.length)
        // Hug the LEFT wall for the first half, the right wall for the second
        // — crossing the centreline exactly once, as far off-centre as the
        // corridor permits without leaving it.
        const side = at < target.length / 2 ? 1 : -1
        const probe = offPoint(target, at, side * half * 0.9)
        const sample = corridorTick(target.polyline, target.length, track, probe.x, probe.y)
        track = sample.track
        const out = sample.distance > half
        if (out) everLeft = true
        // The live gate `LevelPlay.shouldTickClue` applies: no collection
        // while outside.
        if (!out) state = clueTick(state, track.maxArc, marks)
      }

      // 1. The walk never left the corridor, so no `restartRun` would have
      //    fired and this run is a legal one.
      expect(everLeft, `${id}: the wall-hugging walk left the corridor`).toBe(false)
      // 2. It reached the end.
      expect(reachedTrailEnd(track.maxArc, target.length, target.corridorWidth)).toBe(true)
      // 3. Therefore EVERY clue is lit — no tolerance, no exceptions, which
      //    is exactly the sentence the user wrote.
      expect(state.lit.filter(Boolean).length).toBe(marks.length)
      expect(state.lit).toEqual(marks.map(() => true))
    })
  }
})
