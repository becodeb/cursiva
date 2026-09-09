// Assisted rail. Two properties matter: the pull is real on the first attempt,
// and it is GONE by the fourth — an assist that never withdraws is a crutch
// (docs/03 §3 withdraws the visual guide on the same reasoning).
import { describe, expect, it } from 'vitest'
import { RAIL_FADE_ATTEMPTS, RAIL_PULL, railFade, railPull } from './rail'

const anchor = (x: number, y: number, distance: number) => ({ point: { x, y }, distance })

describe('railFade (withdrawal over attempts)', () => {
  it('is full on the very first attempt', () => {
    expect(railFade(0)).toBe(1)
  })

  it('decays linearly across the fade window', () => {
    expect(railFade(1)).toBeCloseTo(0.75)
    expect(railFade(2)).toBeCloseTo(0.5)
    expect(railFade(3)).toBeCloseTo(0.25)
  })

  it('is exactly zero from RAIL_FADE_ATTEMPTS on, and stays there', () => {
    expect(railFade(RAIL_FADE_ATTEMPTS)).toBe(0)
    expect(railFade(RAIL_FADE_ATTEMPTS + 50)).toBe(0)
  })

  it('treats a garbage attempt count as a fresh start rather than throwing', () => {
    expect(railFade(Number.NaN)).toBe(1)
    expect(railFade(-3)).toBe(1)
  })
})

describe('railPull (magnetize the drawn point)', () => {
  it('pulls a point at the corridor edge halfway toward the route', () => {
    // Corridor 100 ⇒ half-width 50. At exactly 50 the proximity damper is 1, so
    // the pull is the full RAIL_PULL fraction.
    const out = railPull(100, 350, anchor(100, 300, 50), 100, 1)
    expect(out.y).toBeCloseTo(350 + (300 - 350) * RAIL_PULL)
    expect(out.x).toBeCloseTo(100)
  })

  it('does not move a point already ON the route — no twitch when it is right', () => {
    expect(railPull(100, 300, anchor(100, 300, 0), 100, 1)).toEqual({ x: 100, y: 300 })
  })

  it('pulls proportionally less the closer the finger already is', () => {
    const far = railPull(100, 350, anchor(100, 300, 50), 100, 1)
    const near = railPull(100, 310, anchor(100, 300, 10), 100, 1)
    expect(Math.abs(350 - far.y)).toBeGreaterThan(Math.abs(310 - near.y))
  })

  it('is the identity once the fade has run out', () => {
    expect(railPull(100, 350, anchor(100, 300, 50), 100, 0)).toEqual({ x: 100, y: 350 })
  })

  it('leaves the point alone when the search found nothing nearby', () => {
    expect(railPull(900, 50, { point: null, distance: Infinity }, 100, 1)).toEqual({
      x: 900,
      y: 50,
    })
    expect(railPull(900, 50, anchor(0, 0, Infinity), 100, 1)).toEqual({ x: 900, y: 50 })
  })

  it('is the identity for a degenerate corridor width', () => {
    expect(railPull(10, 20, anchor(0, 0, 5), 0, 1)).toEqual({ x: 10, y: 20 })
  })

  it('a faded rail moves the ink strictly less than a fresh one', () => {
    const fresh = railPull(100, 350, anchor(100, 300, 50), 100, railFade(0))
    const worn = railPull(100, 350, anchor(100, 300, 50), 100, railFade(3))
    expect(350 - fresh.y).toBeGreaterThan(350 - worn.y)
    expect(350 - worn.y).toBeGreaterThan(0)
  })
})
