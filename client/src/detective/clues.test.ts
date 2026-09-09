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
    const marks = clueMarks(LINE, LENGTH, 5, 'droplet')
    expect(marks).toHaveLength(5)
    // Interior spacing: (i + 1) / (count + 1) of a 100-unit line.
    const xs = marks.map((m) => m.x)
    for (const [i, want] of [100 / 6, 200 / 6, 300 / 6, 400 / 6, 500 / 6].entries()) {
      expect(xs[i]).toBeCloseTo(want, 6)
    }
    for (const m of marks) expect(m.y).toBeCloseTo(0, 6)
  })

  it('never places a mark at either endpoint of the trail', () => {
    // An endpoint mark is invisible under the start or goal marker, and the
    // one at arc 0 is earned for free the moment the child touches down.
    for (const count of [1, 2, 3, 5, 8]) {
      for (const m of clueMarks(LINE, LENGTH, count, 'droplet')) {
        expect(m.x, `count ${count}: a mark landed on an endpoint`).toBeGreaterThan(0)
        expect(m.x, `count ${count}: a mark landed on an endpoint`).toBeLessThan(LENGTH)
      }
    }
  })

  it('faces along the local tangent (a straight rightward line points at angle 0)', () => {
    const marks = clueMarks(LINE, LENGTH, 3, 'droplet')
    for (const m of marks) expect(m.angle).toBeCloseTo(0, 6)
  })

  it('returns no marks for a non-positive count', () => {
    expect(clueMarks(LINE, LENGTH, 0, 'droplet')).toEqual([])
    expect(clueMarks(LINE, LENGTH, -1, 'droplet')).toEqual([])
  })

  it('places a single mark at the midpoint when count is 1', () => {
    // 1 / (1 + 1) of the arc. The start is where the glass already sits, so a
    // lone mark there would be collected before the child moves at all.
    const marks = clueMarks(LINE, LENGTH, 1, 'droplet')
    expect(marks).toHaveLength(1)
    expect(marks[0].x).toBeCloseTo(LENGTH / 2, 6)
  })
})

describe('clueTick', () => {
  const marks: readonly ClueMark[] = clueMarks(LINE, LENGTH, 5, 'droplet') // x = 100/6, 200/6, 50, 400/6, 500/6
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
    // Between the 1/6 mark (16.67) and the 2/6 mark (33.33), further than
    // `radius` from either. Asserted rather than assumed, so this stays a real
    // no-op if the spacing ever changes again.
    const probe = { x: 25, y: 0 }
    for (const m of marks) expect(Math.abs(m.x - probe.x)).toBeGreaterThan(radius)
    const next = clueTick(start, probe, marks, radius)
    expect(next).toBe(start)
  })

  it('carries no tween, delay or animation field across a stream of position updates while the pointer is down — only discrete drained/earned values (spec: "No motion while the pointer is down")', () => {
    // Walk each mark's own position, so the sweep cannot drift out of date
    // when the spacing changes.
    const positions = marks.map((mk) => ({ x: mk.x, y: 0 }))
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
