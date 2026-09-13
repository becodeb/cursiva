// `isSectorDebug` (zoo-map spec "Sector Debug Overlay"). Pure over an
// explicit query string — no `window`, no component context — so it is
// testable directly in this repo's node harness. `isDevMode()` itself reads
// `window` and is exercised only through the screens that already call it;
// it gets no test file of its own here.
import { describe, expect, it } from 'vitest'
import {
  isSectorDebug,
  lightDebugPoint,
  revealDebugFraction,
  seededProgressIds,
  shouldSeedRecoveredDuck,
} from './devMode'

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

describe('seededProgressIds (design.md §9; level-engine spec "Comma-Separated Progress Seeding Flag")', () => {
  it('?debug=progreso:sand4,night2 returns exactly the two listed ids', () => {
    expect(seededProgressIds('?debug=progreso:sand4,night2')).toEqual(['sand4', 'night2'])
  })

  it('returns a single id for a bare, comma-free list', () => {
    expect(seededProgressIds('?debug=progreso:sand4')).toEqual(['sand4'])
  })

  it('is empty for an unrelated or absent query string', () => {
    expect(seededProgressIds('?debug=sectores')).toEqual([])
    expect(seededProgressIds('')).toEqual([])
  })

  it('requires no window/component context', () => {
    expect(seededProgressIds('?debug=progreso:glass1')).toEqual(['glass1'])
  })

  it('never throws on a malformed query string, and returns []', () => {
    expect(() => seededProgressIds('%')).not.toThrow()
    expect(seededProgressIds('%')).toEqual([])
    expect(seededProgressIds('?debug=progreso:')).toEqual([])
  })
})

describe('revealDebugFraction (design.md §9; reveal-grid spec "Screenshot Seeding Flags for Render State")', () => {
  it('?debug=revelado:60 returns 0.6', () => {
    expect(revealDebugFraction('?debug=revelado:60')).toBe(0.6)
  })

  it('is null for an unrelated or absent query string', () => {
    expect(revealDebugFraction('?debug=sectores')).toBeNull()
    expect(revealDebugFraction('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(revealDebugFraction('?debug=revelado:0')).toBe(0)
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => revealDebugFraction('%')).not.toThrow()
    expect(revealDebugFraction('%')).toBeNull()
    expect(revealDebugFraction('?debug=revelado:noesunnumero')).toBeNull()
  })
})

describe('lightDebugPoint (design.md §9; same reveal-grid spec)', () => {
  it('?debug=linterna:500,300 returns {x:500, y:300}', () => {
    expect(lightDebugPoint('?debug=linterna:500,300')).toEqual({ x: 500, y: 300 })
  })

  it('is null for an unrelated or absent query string', () => {
    expect(lightDebugPoint('?debug=sectores')).toBeNull()
    expect(lightDebugPoint('')).toBeNull()
  })

  it('requires no window/component context', () => {
    expect(lightDebugPoint('?debug=linterna:0,0')).toEqual({ x: 0, y: 0 })
  })

  it('never throws on a malformed query string, and returns null', () => {
    expect(() => lightDebugPoint('%')).not.toThrow()
    expect(lightDebugPoint('%')).toBeNull()
    expect(lightDebugPoint('?debug=linterna:500')).toBeNull()
    expect(lightDebugPoint('?debug=linterna:x,y')).toBeNull()
  })
})

describe('?debug=pato-recuperado / ?debug=sectores stay byte-identical (design.md §9)', () => {
  it('shouldSeedRecoveredDuck is unaffected by the new grammar', () => {
    expect(shouldSeedRecoveredDuck('?debug=pato-recuperado')).toBe(true)
    expect(shouldSeedRecoveredDuck('?debug=progreso:sand4')).toBe(false)
  })

  it('isSectorDebug is unaffected by the new grammar', () => {
    expect(isSectorDebug('?debug=sectores')).toBe(true)
    expect(isSectorDebug('?debug=revelado:60')).toBe(false)
  })
})
