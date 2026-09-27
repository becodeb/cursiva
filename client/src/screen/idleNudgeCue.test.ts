// The idle nudge's own geometry contract (T33, `odd/tasks/prewriting-stage-
// completion.md`). Pure — no DOM, no React — the same convention every
// other `levels/*.ts`/`screen/directionArrow.ts` test in this repo follows.
import { describe, expect, it } from 'vitest'
import { EMPTY_SPINES, type SpineConfig } from '../levels/spines'
import {
  INTRO_CUE_MS,
  hasIntroCue,
  idleCueForLevel,
  pathCue,
  spineCue,
  torchSweepCue,
  waypointsCue,
  wipeCue,
} from './idleNudgeCue'

function makeSpineConfig(): SpineConfig {
  return {
    pose: 'curled',
    body: { centre: { x: 500, y: 500 }, height: 300 },
    arc: { from: 0, to: 360 },
    count: 8,
    rules: { baseRadius: 30, tolDeg: 30, straightness: 0.85, lenMin: 80, lenMax: 160 },
  }
}

describe('pathCue', () => {
  it('slides from the start dot to the direction arrow\'s own point', () => {
    const cue = pathCue({ x: 100, y: 300 }, { x: 170, y: 280 })
    expect(cue).toEqual({ visual: 'hand', from: { x: 100, y: 300 }, to: { x: 170, y: 280 } })
  })

  it('is null with no start marker', () => {
    expect(pathCue(undefined, { x: 170, y: 280 })).toBeNull()
  })

  it('is null with no direction arrow (a path too short for one)', () => {
    expect(pathCue({ x: 100, y: 300 }, undefined)).toBeNull()
  })
})

describe('waypointsCue', () => {
  it('slides toward the first stop when it is already within the cap', () => {
    const start = { x: 250, y: 400 }
    const stop = { x: 300, y: 380 } // ~54 units away
    const cue = waypointsCue(start, stop)
    expect(cue?.visual).toBe('hand')
    expect(cue?.from).toEqual(start)
    expect(cue?.to).toEqual(stop)
  })

  it('caps the slide distance rather than jumping the whole errand', () => {
    const start = { x: 250, y: 400 }
    const stop = { x: 500, y: 265 } // bee1's own real first flower, far past the cap
    const cue = waypointsCue(start, stop)
    expect(cue).not.toBeNull()
    const dist = Math.hypot(cue!.to.x - start.x, cue!.to.y - start.y)
    expect(dist).toBeLessThanOrEqual(90 + 1e-6)
    expect(dist).toBeGreaterThan(0)
    // still on the ray toward the real stop (same direction, shorter reach)
    const realDx = stop.x - start.x
    const realDy = stop.y - start.y
    const cueDx = cue!.to.x - start.x
    const cueDy = cue!.to.y - start.y
    expect(Math.atan2(cueDy, cueDx)).toBeCloseTo(Math.atan2(realDy, realDx), 6)
  })

  it('is null with no stops at all', () => {
    expect(waypointsCue({ x: 0, y: 0 }, undefined)).toBeNull()
  })
})

describe('wipeCue', () => {
  it('is a short flat pass centred on the sheet by default', () => {
    const cue = wipeCue()
    expect(cue.visual).toBe('wipe')
    expect(cue.from.y).toBe(cue.to.y) // flat: same y
    expect(cue.to.x).toBeGreaterThan(cue.from.x)
  })

  it('re-centres on a caller-supplied point', () => {
    const cue = wipeCue({ x: 200, y: 150 })
    expect((cue.from.x + cue.to.x) / 2).toBeCloseTo(200)
    expect(cue.from.y).toBe(150)
  })
})

describe('torchSweepCue', () => {
  it('is a diagonal sweep, distinct in shape from the flat wipe', () => {
    const cue = torchSweepCue()
    expect(cue.visual).toBe('torch')
    expect(cue.from.y).not.toBe(cue.to.y)
    expect(cue.to.x).toBeGreaterThan(cue.from.x)
  })
})

describe('spineCue', () => {
  it('points outward from the next unfilled anchor, along its own normal', () => {
    const cfg = makeSpineConfig()
    const cue = spineCue(cfg, EMPTY_SPINES)
    expect(cue?.visual).toBe('hand')
    expect(cue).not.toBeNull()
    const dist = Math.hypot(cue!.to.x - cue!.from.x, cue!.to.y - cue!.from.y)
    expect(dist).toBeCloseTo(40, 5) // SPINE_CUE_LENGTH
  })

  it('advances to the next anchor once the first is filled', () => {
    const cfg = makeSpineConfig()
    const first = spineCue(cfg, EMPTY_SPINES)
    const second = spineCue(cfg, { filled: new Set([0]), aiming: null })
    expect(second?.from).not.toEqual(first?.from)
  })

  it('is null once every anchor is filled — nothing left to nudge toward', () => {
    const cfg = makeSpineConfig()
    const filled = new Set(Array.from({ length: cfg.count }, (_, i) => i))
    expect(spineCue(cfg, { filled, aiming: null })).toBeNull()
  })
})

describe('idleCueForLevel', () => {
  it('dispatches to spineCue when the level declares spines', () => {
    const cfg = makeSpineConfig()
    const cue = idleCueForLevel({ spines: cfg }, {})
    expect(cue).toEqual(spineCue(cfg, EMPTY_SPINES))
  })

  it('dispatches to waypointsCue when the level declares waypoints', () => {
    const cue = idleCueForLevel(
      { waypoints: { start: { x: 10, y: 20 }, stops: [{ x: 40, y: 20 }] } },
      {},
    )
    expect(cue?.visual).toBe('hand')
    expect(cue?.from).toEqual({ x: 10, y: 20 })
  })

  it('dispatches to torchSweepCue for a light reveal', () => {
    const cue = idleCueForLevel({ reveal: { mode: 'light' } }, {})
    expect(cue?.visual).toBe('torch')
  })

  it('dispatches to wipeCue for an erase reveal', () => {
    const cue = idleCueForLevel({ reveal: { mode: 'erase' } }, {})
    expect(cue?.visual).toBe('wipe')
  })

  it('falls back to pathCue for an ordinary routed level', () => {
    const cue = idleCueForLevel({}, { startMarker: { x: 5, y: 5 }, directionArrowPoint: { x: 60, y: 5 } })
    expect(cue).toEqual({ visual: 'hand', from: { x: 5, y: 5 }, to: { x: 60, y: 5 } })
  })

  it('is null for a routed level with no direction arrow and no reveal/waypoints/spines', () => {
    expect(idleCueForLevel({}, {})).toBeNull()
  })
})

describe('hasIntroCue', () => {
  it('is true only when the level authors introCue: true', () => {
    expect(hasIntroCue({ introCue: true })).toBe(true)
  })

  it('is false when absent or explicitly false — every level that predates the field', () => {
    expect(hasIntroCue({})).toBe(false)
    expect(hasIntroCue({ introCue: false })).toBe(false)
  })
})

describe('INTRO_CUE_MS', () => {
  it('is short, per the task\'s own "≤ 2s"', () => {
    expect(INTRO_CUE_MS).toBeLessThanOrEqual(2000)
    expect(INTRO_CUE_MS).toBeGreaterThan(0)
  })
})
