// Clue placement + collection reducer contract (`detective-mode` spec, "Clue
// Collection State Machine"). No DOM: a straight hand-built polyline is
// enough to pin arc-length placement and the discrete flip, the same way
// `screen/directionArrow.test.ts` pins `directionArrowOf` with a hand-built
// `LevelTarget`.
import { describe, expect, it } from 'vitest'
import { clueMarks, clueTick, emptyClueState, type ClueMark, type ClueState } from './clues'

/** A 100-unit horizontal polyline, so arc length equals x and the tangent
 * angle is trivially 0 everywhere. */
const LINE = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
]
const LENGTH = 100

describe('emptyClueState', () => {
  it('starts every mark drained', () => {
    expect(emptyClueState(5)).toEqual({ lit: [false, false, false, false, false] })
  })

  it('never goes negative for a bad count', () => {
    expect(emptyClueState(-3)).toEqual({ lit: [] })
  })
})

describe('clueMarks', () => {
  it('places count marks uniformly in arc length, first at the start and last at the end', () => {
    const marks = clueMarks(LINE, LENGTH, 5)
    expect(marks).toHaveLength(5)
    expect(marks.map((m) => m.x)).toEqual([0, 25, 50, 75, 100])
    for (const m of marks) expect(m.y).toBeCloseTo(0, 6)
  })

  it('faces along the local tangent (a straight rightward line points at angle 0)', () => {
    const marks = clueMarks(LINE, LENGTH, 3)
    for (const m of marks) expect(m.angle).toBeCloseTo(0, 6)
  })

  it('returns no marks for a non-positive count', () => {
    expect(clueMarks(LINE, LENGTH, 0)).toEqual([])
    expect(clueMarks(LINE, LENGTH, -1)).toEqual([])
  })

  it('places a single mark at the start when count is 1', () => {
    const marks = clueMarks(LINE, LENGTH, 1)
    expect(marks).toHaveLength(1)
    expect(marks[0].x).toBeCloseTo(0, 6)
  })
})

describe('clueTick', () => {
  const marks: readonly ClueMark[] = clueMarks(LINE, LENGTH, 5) // x = 0, 25, 50, 75, 100
  const radius = 5

  it('flips a mark from drained to earned in exactly one dispatch, no intermediate state (spec: "Mark flips exactly once as the glass passes")', () => {
    const start = emptyClueState(5)
    const next = clueTick(start, { x: 50, y: 0 }, marks, radius)
    expect(next.lit).toEqual([false, false, true, false, false])
    // The input state itself was not mutated.
    expect(start.lit).toEqual([false, false, false, false, false])
  })

  it('never unlights a mark once earned, even far from every mark (monotone)', () => {
    const earned: ClueState = { lit: [true, false, false, false, false] }
    const next = clueTick(earned, { x: 999, y: 999 }, marks, radius)
    expect(next.lit[0]).toBe(true)
  })

  it('re-passing an earned mark returns the SAME state and emits no event (spec: "Re-passing an earned mark is inert")', () => {
    const start = emptyClueState(5)
    const first = clueTick(start, { x: 50, y: 0 }, marks, radius)
    const second = clueTick(first, { x: 50, y: 0 }, marks, radius)
    expect(second).toBe(first) // referential equality: no new object, no event
    expect(second).toEqual(first)
  })

  it('a no-op sample (nothing within radius) also returns the SAME state', () => {
    const start = emptyClueState(5)
    const next = clueTick(start, { x: 12, y: 0 }, marks, radius)
    expect(next).toBe(start)
  })

  it('carries no tween, delay or animation field across a stream of position updates while the pointer is down — only discrete drained/earned values (spec: "No motion while the pointer is down")', () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 24, y: 0 },
      { x: 25, y: 0 },
      { x: 40, y: 0 },
      { x: 51, y: 0 },
      { x: 76, y: 0 },
      { x: 100, y: 0 },
    ]
    let state = emptyClueState(5)
    for (const p of positions) {
      state = clueTick(state, p, marks, radius)
      expect(Object.keys(state)).toEqual(['lit'])
      for (const value of state.lit) expect(typeof value).toBe('boolean')
    }
    // Every mark was passed at radius, so all five ended up earned.
    expect(state.lit).toEqual([true, true, true, true, true])
  })
})
