// Going to and fro along a route (`docs/25` 4.1). Order zones only ask whether a
// stroke reached each place in turn, and a zigzag crosses the route at every one
// of them, so no zone small enough to be fair can tell it from a stroke. What
// tells them apart is how much line it took to get there.
//
// Pure, and read along the arc, so the event rate of the device plays no part.
import type { Point } from '../../letters/types'
import { evenlyAlongArc } from './fluency'

export interface BackAndForthResult {
  backAndForth: boolean
  /** Line drawn per unit of route covered. A clean stroke is near 1. */
  travelRatio: number
  /** Share of the route covered that was walked backwards. */
  backtrackRatio: number
}

/** Jitter under this spacing is the touchscreen, not the hand. */
const READ_STEP = 6
/** How far along the route the head may be found from where it just was: what
 *  stops the far arm of a loop from reading as a jump. */
const SEARCH_WINDOW = 90
/** Distances this close count as the same place. */
const NEAR_BEST = 3
/** How much nearer the route behind must be to believe the head went back. */
const CLEARLY_BEHIND = 14
/** A wobbly five-year-old stays well under 1.4; a zigzag runs from 2 up. */
const MAX_TRAVEL_RATIO = 1.9
/** A correction is allowed: repeating a third of the route is not one. */
const MAX_BACKTRACK_RATIO = 0.35
/** Backward motion under this is a wobble projected on the route. */
const BACKTRACK_DEADBAND = 10

export function checkBackAndForth(
  strokes: ReadonlyArray<ReadonlyArray<Point>>,
  route: ReadonlyArray<Point>,
): BackAndForthResult {
  const model = evenlyAlongArc(route, READ_STEP)
  if (model.length < 2) return { backAndForth: false, travelRatio: 1, backtrackRatio: 0 }
  const windowSteps = Math.ceil(SEARCH_WINDOW / READ_STEP)
  let at = 0
  let reached = 0
  let drawn = 0
  let backwards = 0
  let held = 0
  for (const stroke of strokes) {
    const even = evenlyAlongArc(stroke, READ_STEP)
    drawn += Math.max(0, even.length - 1) * READ_STEP
    for (const p of even) {
      const distanceTo = (i: number): number => Math.hypot(model[i].x - p.x, model[i].y - p.y)
      let bestAhead = Infinity
      const lastAhead = Math.min(model.length - 1, at + windowSteps)
      for (let i = at; i <= lastAhead; i++) bestAhead = Math.min(bestAhead, distanceTo(i))
      // The earliest of the near-best: a letter's stems run back over themselves,
      // and the head should reach the far side of a cusp by walking, not by jumping.
      let ahead = at
      for (let i = at; i <= lastAhead; i++) {
        if (distanceTo(i) <= bestAhead + NEAR_BEST) {
          ahead = i
          break
        }
      }
      // Behind only when clearly nearer than anything ahead: where a route runs
      // over itself, the two read the same and the head keeps going forward.
      let bestBehind = Infinity
      let behind = at
      for (let i = Math.max(0, at - windowSteps); i < at; i++) {
        const d = distanceTo(i)
        if (d < bestBehind) {
          bestBehind = d
          behind = i
        }
      }
      at = bestBehind + CLEARLY_BEHIND < bestAhead ? behind : ahead
      reached = Math.max(reached, at)
      // Backward arc, counted past a deadband from the furthest point of this run.
      if (at >= held) held = at
      else if ((held - at) * READ_STEP > BACKTRACK_DEADBAND) {
        backwards += (held - at) * READ_STEP
        held = at
      }
    }
  }
  const covered = Math.max(reached * READ_STEP, READ_STEP)
  const travelRatio = drawn / covered
  const backtrackRatio = backwards / covered
  return {
    backAndForth: travelRatio > MAX_TRAVEL_RATIO || backtrackRatio > MAX_BACKTRACK_RATIO,
    travelRatio,
    backtrackRatio,
  }
}
