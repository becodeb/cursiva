// `isSectorDebug` (zoo-map spec "Sector Debug Overlay"). Pure over an
// explicit query string — no `window`, no component context — so it is
// testable directly in this repo's node harness. `isDevMode()` itself reads
// `window` and is exercised only through the screens that already call it;
// it gets no test file of its own here.
import { describe, expect, it } from 'vitest'
import { isSectorDebug, shouldSeedRecoveredDuck } from './devMode'

describe('isSectorDebug (zoo-map spec "Sector Debug Overlay")', () => {
  it('is true for ?debug=sectores', () => {
    expect(isSectorDebug('?debug=sectores')).toBe(true)
  })

  it('is false for an unrelated or absent query string', () => {
    expect(isSectorDebug('?dev')).toBe(false)
    expect(isSectorDebug('')).toBe(false)
  })

  it('is false for a same-key different-value query', () => {
    expect(isSectorDebug('?debug=otracosa')).toBe(false)
  })

  it('never throws on a malformed query string', () => {
    expect(() => isSectorDebug('%')).not.toThrow()
    expect(isSectorDebug('%')).toBe(false)
  })
})

describe('shouldSeedRecoveredDuck (duck-undulations-and-sector-backdrop screenshot capture aid)', () => {
  it('is true for ?debug=pato-recuperado', () => {
    expect(shouldSeedRecoveredDuck('?debug=pato-recuperado')).toBe(true)
  })

  it('is false for an unrelated or absent query string', () => {
    expect(shouldSeedRecoveredDuck('?debug=sectores')).toBe(false)
    expect(shouldSeedRecoveredDuck('')).toBe(false)
  })

  it('never throws on a malformed query string', () => {
    expect(() => shouldSeedRecoveredDuck('%')).not.toThrow()
    expect(shouldSeedRecoveredDuck('%')).toBe(false)
  })
})
