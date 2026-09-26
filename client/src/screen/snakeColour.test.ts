// Snake colour-follows-the-finger contract (`docs/19` §3.1; T20). Pure, no
// DOM — hand-built straight-line routes pin the reveal/fade math directly,
// the same convention `corridorTrack.test.ts`/`levels/collect.test.ts` use
// for their own sibling modules.
import { describe, expect, it } from 'vitest'
import {
  emptySnakeColourState,
  nextWakingIndex,
  snakeColourTick,
  SNAKE_COLOUR_FADE_MS,
  type SnakeColourState,
} from './snakeColour'
import { CORRIDOR_TRACK_START } from './corridorTrack'
import type { RouteSegment } from '../levels/types'

/** Three 100-unit horizontal lines, far enough apart that a point near one
 *  is never accidentally "inside" another — mirrors the real snake family's
 *  own C3/C4 separation guarantee (`catalog.test.ts`), so this fixture is a
 *  faithful simplification, not an unrealistic one. */
function route(y: number): RouteSegment {
  return { polyline: [{ x: 0, y }, { x: 100, y }], length: 100 }
}
const ROUTES: readonly RouteSegment[] = [route(0), route(200), route(400)]
const WIDTH = 20

describe('emptySnakeColourState', () => {
  it('starts every piece grey, idle, not done', () => {
    const state = emptySnakeColourState(3)
    expect(state.pieces).toHaveLength(3)
    for (const piece of state.pieces) {
      expect(piece.progress).toBe(0)
      expect(piece.done).toBe(false)
      expect(piece.fadeFrom).toBeNull()
    }
  })

  it('never goes negative for a bad count', () => {
    expect(emptySnakeColourState(-1).pieces).toHaveLength(0)
  })
})

describe('snakeColourTick — reveal follows the finger', () => {
  it('advances the traced piece toward 1 as the finger moves along it, leaving the others untouched', () => {
    let state = emptySnakeColourState(3)
    state = snakeColourTick(state, ROUTES, { x: 25, y: 0 }, true, WIDTH, 1000)
    expect(state.pieces[0].progress).toBeCloseTo(0.25, 5)
    expect(state.pieces[1].progress).toBe(0)
    expect(state.pieces[2].progress).toBe(0)

    state = snakeColourTick(state, ROUTES, { x: 75, y: 0 }, true, WIDTH, 1100)
    expect(state.pieces[0].progress).toBeCloseTo(0.75, 5)
  })

  it('marks a piece done once its own maxArc reaches the route length, and freezes it at 1', () => {
    let state = emptySnakeColourState(3)
    state = snakeColourTick(state, ROUTES, { x: 100, y: 0 }, true, WIDTH, 1000)
    expect(state.pieces[0].progress).toBe(1)
    expect(state.pieces[0].done).toBe(true)
    // A done piece is never touched again — even moving the finger far away
    // leaves it exactly as it was.
    const next = snakeColourTick(state, ROUTES, { x: 1000, y: 1000 }, true, WIDTH, 5000)
    expect(next.pieces[0]).toBe(state.pieces[0])
  })

  it('never un-collects a piece by re-tracing it past its own high-water mark backwards mid-pass', () => {
    // `corridorTick`'s own `maxArc` is a running maximum — a wobble back
    // toward the start must not visibly un-reveal what was already shown.
    let state = emptySnakeColourState(3)
    state = snakeColourTick(state, ROUTES, { x: 80, y: 0 }, true, WIDTH, 1000)
    expect(state.pieces[0].progress).toBeCloseTo(0.8, 5)
    state = snakeColourTick(state, ROUTES, { x: 40, y: 0 }, true, WIDTH, 1100)
    // Still inside the corridor, so this is a live sample, not a fade — but
    // the underlying track's `maxArc` stays at 80, so progress cannot drop.
    expect(state.pieces[0].progress).toBeCloseTo(0.8, 5)
  })

  it('treats the finger being up exactly like being off every piece', () => {
    let state = emptySnakeColourState(3)
    state = snakeColourTick(state, ROUTES, { x: 25, y: 0 }, true, WIDTH, 1000)
    expect(state.pieces[0].progress).toBeCloseTo(0.25, 5)
    // The finger lifts THIS tick: the fade starts (fadeFrom stamped), but no
    // time has elapsed yet within the same tick, so progress has not moved.
    const lifted = snakeColourTick(state, ROUTES, null, false, WIDTH, 1050)
    expect(lifted.pieces[0].fadeFrom).toBe(1050)
    expect(lifted.pieces[0].progress).toBeCloseTo(0.25, 5)
    // A LATER tick, still lifted, shows the actual decay.
    const later = snakeColourTick(lifted, ROUTES, null, false, WIDTH, 1050 + SNAKE_COLOUR_FADE_MS / 2)
    expect(later.pieces[0].progress).toBeCloseTo(0.125, 5)
  })
})

describe('snakeColourTick — leaving the line fades back to grey and restarts', () => {
  it('eases a piece back to 0 over SNAKE_COLOUR_FADE_MS once the finger leaves it', () => {
    let state = emptySnakeColourState(3)
    state = snakeColourTick(state, ROUTES, { x: 50, y: 0 }, true, WIDTH, 0)
    expect(state.pieces[0].progress).toBeCloseTo(0.5, 5)

    // Leaves the corridor entirely at t=10 — the fade is stamped from HERE,
    // not from whenever progress was first reached.
    const left = snakeColourTick(state, ROUTES, { x: 50, y: 1000 }, true, WIDTH, 10)
    expect(left.pieces[0].fadeFrom).toBe(10)
    expect(left.pieces[0].progress).toBeCloseTo(0.5, 5)

    const half = snakeColourTick(left, ROUTES, { x: 50, y: 1000 }, true, WIDTH, 10 + SNAKE_COLOUR_FADE_MS / 2)
    expect(half.pieces[0].progress).toBeCloseTo(0.25, 5) // eased halfway from 0.5 toward 0
    expect(half.pieces[0].done).toBe(false)

    const done = snakeColourTick(half, ROUTES, { x: 50, y: 1000 }, true, WIDTH, 10 + SNAKE_COLOUR_FADE_MS)
    expect(done.pieces[0].progress).toBe(0)
    expect(done.pieces[0].fadeFrom).toBeNull()
  })

  it('resets the underlying track the instant the finger leaves, so a touch mid-fade rebuilds from the head instead of jumping back', () => {
    // x=70 (< `trailEndArc(100, 20)` = 90), so this is genuinely mid-route,
    // not close enough to the tip to already read as done.
    let state = emptySnakeColourState(3)
    state = snakeColourTick(state, ROUTES, { x: 70, y: 0 }, true, WIDTH, 0)
    expect(state.pieces[0].progress).toBeCloseTo(0.7, 5)

    // Leaves at t=10 (progress unchanged the instant it leaves), decays a
    // little more by t=60, then touches back down near the START before the
    // fade finishes.
    state = snakeColourTick(state, ROUTES, { x: 70, y: 1000 }, true, WIDTH, 10)
    state = snakeColourTick(state, ROUTES, { x: 70, y: 1000 }, true, WIDTH, 60)
    expect(state.pieces[0].progress).toBeLessThan(0.7) // already decaying
    state = snakeColourTick(state, ROUTES, { x: 10, y: 0 }, true, WIDTH, 70)
    // Rebuilt from the head — nowhere near the old 0.7 high-water mark.
    expect(state.pieces[0].progress).toBeCloseTo(0.1, 5)
    expect(state.pieces[0].fadeFrom).toBeNull()
  })

  it('reaches `done` once maxArc clears `trailEndArc(length, corridorWidth)`, not only at the literal length — the same float-rounding tolerance `levels/collect.ts` needed for the exact same "reached the end" problem', () => {
    // `trailEndArc(100, 20)` = 90: x=90 is close enough to the tip to count
    // as reached, even though it is not literally x=100.
    let state = emptySnakeColourState(3)
    state = snakeColourTick(state, ROUTES, { x: 90, y: 0 }, true, WIDTH, 0)
    expect(state.pieces[0].progress).toBe(1)
    expect(state.pieces[0].done).toBe(true)
  })

  it('never disturbs a piece that is already fully idle (no-op fade)', () => {
    const state = emptySnakeColourState(3)
    const next = snakeColourTick(state, ROUTES, { x: 1000, y: 1000 }, true, WIDTH, 999)
    expect(next).toBe(state)
  })

  it('does not touch a piece that is not being traced and never was', () => {
    let state = emptySnakeColourState(3)
    state = snakeColourTick(state, ROUTES, { x: 25, y: 0 }, true, WIDTH, 0)
    expect(state.pieces[1]).toEqual({
      track: CORRIDOR_TRACK_START,
      progress: 0,
      fadeFrom: null,
      fadeStartProgress: 0,
      done: false,
    })
  })
})

describe('nextWakingIndex', () => {
  it('is the first piece in authored order that is not done', () => {
    const state: SnakeColourState = {
      pieces: [
        { track: CORRIDOR_TRACK_START, progress: 1, fadeFrom: null, fadeStartProgress: 1, done: true },
        { track: CORRIDOR_TRACK_START, progress: 0.4, fadeFrom: null, fadeStartProgress: 0.4, done: false },
        { track: CORRIDOR_TRACK_START, progress: 0, fadeFrom: null, fadeStartProgress: 0, done: false },
      ],
    }
    expect(nextWakingIndex(state)).toBe(1)
  })

  it('is null once every piece is done', () => {
    const state: SnakeColourState = {
      pieces: [
        { track: CORRIDOR_TRACK_START, progress: 1, fadeFrom: null, fadeStartProgress: 1, done: true },
        { track: CORRIDOR_TRACK_START, progress: 1, fadeFrom: null, fadeStartProgress: 1, done: true },
      ],
    }
    expect(nextWakingIndex(state)).toBeNull()
  })

  it('is 0 for a fresh empty state', () => {
    expect(nextWakingIndex(emptySnakeColourState(3))).toBe(0)
  })
})
