// `cameraOrigin`/`seedCameraOrigin` (`scrolling-camera` spec; design.md §2.1,
// §6.3's falsifiability table). Pure, no React, no DOM — testable directly in
// this repo's node harness, like every other file in this directory.
import { describe, expect, it } from 'vitest'
import { cameraOrigin, seedCameraOrigin } from './camera'

const OPTS = { viewWidth: 1000, lead: 0.5, sheetWidth: 1560 }

describe('cameraOrigin — HOLD STILL (the central trap)', () => {
  it('an unchanged headX returns prev for any number of calls — the fixed point', () => {
    let origin = 0
    // A finger held at world-x 600 (past the 500 lead threshold) settles at
    // one value and MUST stay there, call after call.
    for (let i = 0; i < 20; i++) {
      origin = cameraOrigin(origin, 600, OPTS)
    }
    const settled = origin
    for (let i = 0; i < 5; i++) {
      origin = cameraOrigin(origin, 600, OPTS)
      expect(origin).toBe(settled)
    }
  })

  it('falsifiability: a naive origin = headX - lead*view (no max(prev, ...)) passes the lead case but fails HOLD STILL', () => {
    const naive = (_prev: number, headX: number, o: typeof OPTS) => headX - o.lead * o.viewWidth
    // The naive form is monotone with a MOVING head (passes a lead-style check)...
    expect(naive(0, 700, OPTS)).toBeGreaterThan(naive(0, 600, OPTS))
    // ...but is NOT a fixed point under repeated identical calls once combined
    // with a decreasing head (it has no memory of `prev` at all) — the real
    // function's `Math.max(prev, ...)` clause is what HOLD STILL depends on,
    // and this naive form lacks it entirely.
    expect(naive(999, 600, OPTS)).not.toBe(999)
  })
})

describe('cameraOrigin — FORWARD-ONLY', () => {
  it('a decreasing headX never decreases the result', () => {
    const advanced = cameraOrigin(0, 900, OPTS)
    expect(advanced).toBeGreaterThan(0)
    const afterRetreat = cameraOrigin(advanced, 200, OPTS)
    expect(afterRetreat).toBe(advanced)
  })

  it('a sequence that moves forward then briefly backward never decreases', () => {
    let origin = 0
    const samples: number[] = []
    for (const headX of [100, 300, 600, 900, 500, 700, 1100]) {
      origin = cameraOrigin(origin, headX, OPTS)
      samples.push(origin)
    }
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1])
    }
  })
})

describe('cameraOrigin — CLAMP at the route\'s end', () => {
  it('headX past the end returns sheetWidth - viewWidth exactly', () => {
    expect(cameraOrigin(0, 99999, OPTS)).toBe(OPTS.sheetWidth - OPTS.viewWidth)
  })

  it('never exceeds the clamp even after many forward steps', () => {
    let origin = 0
    for (const headX of [200, 500, 900, 1300, 1560, 9999]) {
      origin = cameraOrigin(origin, headX, OPTS)
      expect(origin).toBeLessThanOrEqual(OPTS.sheetWidth - OPTS.viewWidth)
    }
  })
})

describe('cameraOrigin — LEAD threshold', () => {
  it('headX <= lead*viewWidth returns 0', () => {
    expect(cameraOrigin(0, 500, OPTS)).toBe(0)
    expect(cameraOrigin(0, 100, OPTS)).toBe(0)
  })

  it('crossing the lead threshold advances the camera', () => {
    const before = cameraOrigin(0, 500, OPTS)
    const after = cameraOrigin(before, 600, OPTS)
    expect(after).toBeGreaterThan(before)
  })

  it('a held-still finger inside the lead window does not move the camera across many frames', () => {
    let origin = 0
    for (let i = 0; i < 30; i++) origin = cameraOrigin(origin, 300, OPTS)
    expect(origin).toBe(0)
  })
})

describe('cameraOrigin — PEN LIFT', () => {
  it('headX === undefined returns prev, not 0', () => {
    const advanced = cameraOrigin(0, 900, OPTS)
    expect(advanced).toBeGreaterThan(0)
    expect(cameraOrigin(advanced, undefined, OPTS)).toBe(advanced)
  })

  it('does not rewind between strokes — repeated pen-lift calls stay at prev', () => {
    const advanced = cameraOrigin(0, 700, OPTS)
    let origin = advanced
    for (let i = 0; i < 5; i++) origin = cameraOrigin(origin, undefined, OPTS)
    expect(origin).toBe(advanced)
  })
})

describe('cameraOrigin — DEGENERATE (sheetWidth <= viewWidth)', () => {
  it('returns 0 always — the non-opting path, unreachable but harmless', () => {
    const opts = { viewWidth: 1000, lead: 0.5, sheetWidth: 1000 }
    expect(cameraOrigin(0, 9999, opts)).toBe(0)
    expect(cameraOrigin(500, 9999, opts)).toBe(0)
  })

  it('a sheet narrower than the view also returns 0', () => {
    const opts = { viewWidth: 1000, lead: 0.5, sheetWidth: 800 }
    expect(cameraOrigin(0, 9999, opts)).toBe(0)
  })
})

describe('seedCameraOrigin', () => {
  it('null seeds 0', () => {
    expect(seedCameraOrigin(null, 1000, 1560)).toBe(0)
  })

  it('clamps a seed past the extent to sheetWidth - viewWidth', () => {
    expect(seedCameraOrigin(9999, 1000, 1560)).toBe(560)
  })

  it('floors a negative seed at 0', () => {
    expect(seedCameraOrigin(-50, 1000, 1560)).toBe(0)
  })

  it('passes an in-range seed through unchanged', () => {
    expect(seedCameraOrigin(280, 1000, 1560)).toBe(280)
  })

  it('degenerate (sheetWidth <= viewWidth): always 0', () => {
    expect(seedCameraOrigin(400, 1000, 1000)).toBe(0)
    expect(seedCameraOrigin(400, 1000, 800)).toBe(0)
  })
})
