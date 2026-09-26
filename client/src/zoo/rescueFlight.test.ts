// rescueFlight pure-math and handoff tests (prewriting-stage-completion
// T24). Node environment, no DOM — every function here takes plain numbers
// or plain `{ matches: boolean }`/`{ startViewTransition?: unknown }`
// fixtures instead of touching `window`/`document` (this module's own
// header on why the geometry and the feature-detects are pure).
import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetPendingDepartureForTests,
  flipDelta,
  peekPendingDeparture,
  prefersReducedMotion,
  recordDeparture,
  RESCUE_FLIGHT_VT_NAME,
  supportsViewTransitions,
  takeDeparture,
  viewBoxRectToScreenRect,
} from './rescueFlight'

beforeEach(() => {
  __resetPendingDepartureForTests()
})

describe('viewBoxRectToScreenRect (T24: mapping a viewBox box into on-screen CSS pixels)', () => {
  it('a 1:1 svg screen rect matching the viewBox aspect maps 1:1, offset by the svg rect origin', () => {
    // viewBox 1000x600 (ZooMap's own), svg rendered at exactly that size at (10, 20).
    const result = viewBoxRectToScreenRect(
      { x: 100, y: 60, width: 50, height: 30 },
      { x: 10, y: 20, width: 1000, height: 600 },
      { width: 1000, height: 600 },
    )
    expect(result).toEqual({ x: 110, y: 80, width: 50, height: 30 })
  })

  it('a WIDER svg rect than the viewBox aspect letterboxes left/right (contain fit, xMidYMid)', () => {
    // viewBox 1000x600 (aspect 1.667) inside a 2000x600 svg box: height-bound,
    // scale = 600/600 = 1, rendered width = 1000, leftover width = 1000,
    // centred => 500px empty on each side.
    const svgScreenRect = { x: 0, y: 0, width: 2000, height: 600 }
    const result = viewBoxRectToScreenRect({ x: 0, y: 0, width: 1000, height: 600 }, svgScreenRect, {
      width: 1000,
      height: 600,
    })
    expect(result).toEqual({ x: 500, y: 0, width: 1000, height: 600 })
  })

  it('a TALLER svg rect than the viewBox aspect letterboxes top/bottom, and scales a nested box correctly', () => {
    // viewBox 1000x600 inside a 1000x1200 svg box: width-bound, scale = 1,
    // rendered height = 600, leftover height = 600, centred => 300px top/bottom.
    const svgScreenRect = { x: 0, y: 0, width: 1000, height: 1200 }
    const result = viewBoxRectToScreenRect({ x: 400, y: 300, width: 100, height: 50 }, svgScreenRect, {
      width: 1000,
      height: 600,
    })
    expect(result).toEqual({ x: 400, y: 600, width: 100, height: 50 })
  })

  it('scales down proportionally when the svg is rendered smaller than the viewBox', () => {
    // viewBox 1000x600 inside a 500x300 svg box: scale = 0.5 on both axes.
    const svgScreenRect = { x: 0, y: 0, width: 500, height: 300 }
    const result = viewBoxRectToScreenRect({ x: 800, y: 500, width: 100, height: 60 }, svgScreenRect, {
      width: 1000,
      height: 600,
    })
    expect(result).toEqual({ x: 400, y: 250, width: 50, height: 30 })
  })
})

describe('flipDelta (T24: the manual-fallback FLIP invert)', () => {
  it('is the identity when from and to are the same rect', () => {
    const rect = { x: 10, y: 20, width: 30, height: 40 }
    expect(flipDelta(rect, rect)).toEqual({ translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 })
  })

  it('translates by the top-left offset and scales by the size ratio', () => {
    const from = { x: 100, y: 50, width: 200, height: 100 }
    const to = { x: 300, y: 250, width: 50, height: 25 }
    expect(flipDelta(from, to)).toEqual({ translateX: -200, translateY: -200, scaleX: 4, scaleY: 4 })
  })

  it('applying the delta to `to` reproduces `from` exactly (round-trip)', () => {
    const from = { x: 12, y: 340, width: 88, height: 44 }
    const to = { x: 560, y: 210, width: 176, height: 88 }
    const delta = flipDelta(from, to)
    // transform-origin 0 0: scale first, then translate, both about (to.x, to.y).
    const reconstructed = {
      x: to.x + delta.translateX,
      y: to.y + delta.translateY,
      width: to.width * delta.scaleX,
      height: to.height * delta.scaleY,
    }
    expect(reconstructed).toEqual(from)
  })
})

describe('supportsViewTransitions (T24)', () => {
  it('true only when startViewTransition is a function', () => {
    expect(supportsViewTransitions({ startViewTransition: () => {} })).toBe(true)
  })

  it('false for undefined, null, or a non-function value', () => {
    expect(supportsViewTransitions(undefined)).toBe(false)
    expect(supportsViewTransitions(null)).toBe(false)
    expect(supportsViewTransitions({})).toBe(false)
    expect(supportsViewTransitions({ startViewTransition: 'nope' } as never)).toBe(false)
  })
})

describe('prefersReducedMotion (T24)', () => {
  it('reads .matches straight through', () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true)
    expect(prefersReducedMotion({ matches: false })).toBe(false)
  })

  it('defaults to false (motion allowed) when no query result is available', () => {
    expect(prefersReducedMotion(null)).toBe(false)
    expect(prefersReducedMotion(undefined)).toBe(false)
  })
})

describe('departure handoff (T24: recordDeparture/peekPendingDeparture/takeDeparture)', () => {
  const rect = { x: 1, y: 2, width: 3, height: 4 }

  it('nothing pending before any recordDeparture call', () => {
    expect(peekPendingDeparture(0)).toBeNull()
    expect(takeDeparture(0)).toBeNull()
  })

  it('peek reports the animal without consuming it — a later peek still sees it', () => {
    recordDeparture('pato', rect, 1000)
    expect(peekPendingDeparture(1100)).toBe('pato')
    expect(peekPendingDeparture(1200)).toBe('pato')
  })

  it('take consumes it once — a second take (or peek) finds nothing left', () => {
    recordDeparture('oveja', rect, 1000)
    expect(takeDeparture(1100)).toEqual({ animalId: 'oveja', rect })
    expect(takeDeparture(1200)).toBeNull()
    expect(peekPendingDeparture(1200)).toBeNull()
  })

  it('a departure older than the TTL is treated as stale by both peek and take', () => {
    recordDeparture('llama', rect, 0)
    expect(peekPendingDeparture(999_999)).toBeNull()
    expect(takeDeparture(999_999)).toBeNull()
  })

  it('a fresh recordDeparture overwrites an earlier, still-fresh one', () => {
    recordDeparture('pato', rect, 1000)
    recordDeparture('llama', { x: 9, y: 9, width: 9, height: 9 }, 1050)
    expect(takeDeparture(1100)).toEqual({ animalId: 'llama', rect: { x: 9, y: 9, width: 9, height: 9 } })
  })

  it('RESCUE_FLIGHT_VT_NAME is a stable, non-empty identifier', () => {
    expect(typeof RESCUE_FLIGHT_VT_NAME).toBe('string')
    expect(RESCUE_FLIGHT_VT_NAME.length).toBeGreaterThan(0)
  })
})
